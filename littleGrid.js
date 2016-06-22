/**
 * LITTLE GRID API
 *
 * Requires the following libraries:
 * ---------------------------------
 * semantic-ui - http://www.semantic-ui.com/
 * knockout.js - http://knockoutjs.com/
 * moment.js - http://momentjs.com/
 *
 * Configuration:
 * --------------
 * data - JsonArray
 * pager - boolean (default false) >> add a pager to the bottom of your grid
 * pageSize - integer (default 5) >> specify how many items you want to show on each page > only takes affect if pager setting is true
 * columns - JsonArray >> settings below
 *   > headerText - varchar >> table header text
 *   > rowText - varchar || function >> table column text which is auto formatted to replace empty values with dashes "-"
 *   > money - boolean (default false) >> format rowText to R #.##
 *   > dateFormat - varchar >> date as displayed in the data JsonArray
 *   > displayFormat - varchar >> data JsonArray date to be display as - refer to moment.js site for examples
 *   > button - boolean (default false) >> display a button instead of text
 *   > href - varchar >> your buttons href > only takes affect if button is true
 *   > method - varchar >> function to be called when button is clicked. params passed to function "data", "element" > if button is not set and method is set the label will be a hyperlink
 *   > colour - function >> this function must return a json object refer below to example, this example are based on knockout's logic
 *   > width - varchar >> this uses semantic-ui grid system, refer to there documentation or below for an example
 * detail - boolean (default false) >> turn the grid into a detailed grid which can expand
 * detailNode - varchar (default empty string) >> specify if your detailed data is in a nested JsonArray
 * detailMethod - varchar (default empty string) >> refer to "columns" > "method", triggered on row expand
 * detailColumns - refer to "columns"
 *   > rowTemplate - varchar (html) >> adds html code to your grid for better customization > the world is your oyster as to what you add - have fun
 *   > customTemplate - JsonNode >> should you require binding and more control which the rowTemplate cannot offer use a customTemplate
 *
 * EXAMPLE:
 * --------
 *
 * >> Setting up your model <<
 *
    var MyModel = function(myData) {
        var self = this;
        self.data = ko.observableArray(myData);

        self.myModal = new ko.littleGrid.viewModel({
            data: self.data,
            columns: [
                { headerText: "Name", rowText: "name", width: "ten wide" },
                { headerText: "Surname", rowText: "surname" },
                { headerText: "Status", rowText: function (item) { return item.status === 'A' ? 'Active' : 'Inactive' },
                  colour: function(item) { return { redClass: item.status === 'A' } } },
                { headerText: "Salary", rowText: "salary", money: true },
                { headerText: "Date Created", rowText: "dateCreated", dateFormat: "DD-MM-YYYY HH:mm:ss", displayFormat: "DD-MM-YYYY HH:mm" },
                { headerText: "Action", rowText: "Load User", button: true, href: "/loadUser/{userId}" },
                { headerText: "Action", rowText: "Remove User", button: true, method: "removeUser" }
            ],
            detail: true,
            detailColumns: [
                { rowTemplate: "<div>User Header</div>" }
                { headerText: "Department", rowText: "department" },
                { headerText: "Occupation", rowText: "occupation" },
                { headerText: "Date Modified", rowText: "dateModified", dateFormat: "DD-MM-YYYY HH:mm:ss", displayFormat: "DD-MM-YYYY HH:mm" },
                { customTemplate: { name: "myCustomTemplate" } } // look below how to setup a customTemplate
            ],
            pager: true,
            pageSize: 10
        });
    };

    ko.applyBindings(new MyModel(your_data), document.getElementById("user"));

    // take note that as optional parameters can be passed to your function for the selected row
    function removeUser(data, element) {
        do something
    }

 *
 * >> Setting up your html <<
 *
 * binding your model to a container
    <div id="user">
        <div data-bind='littleGrid: myModal' class="ui grid tableData"></div>
    </div>

 *  OR if you only want to bind it to the grid

    <div id="user" data-bind='littleGrid: myModal' class="ui grid tableData"></div>

 *
 * >> Setting up your customTemplate <<
 *

     <script type="text/html" id="myCustomTemplate">
         <div data-bind="visible: $parent.status === 'A'" class='row padding-top-0 padding-bottom-0'>
             <div class='column'>
                <label>Generate User Stats</label>
             </div>
             <div class='column'>
                <img src='@routes.Assets.at("images/prettyButton.png")' width='40px' height='40px' data-bind="click: doSomething($parent, event)"/>
             </div>
         </div>
         <div data-bind="visible: $parent.status === 'A'" class='row padding-top-0 padding-bottom-0'>
             <div class='sixteen wide column userStats'></div>
         </div>
     </script>

 *
 */

(function () {
    ko.littleGrid = {
        // Defines a view model class you can use to populate a grid
        viewModel: function (configuration) {
            var self = this;
            self.data = configuration.data;
            self.currentPageIndex = ko.observable(0);
            self.pager = configuration.pager || false;
            self.pageSize = configuration.pageSize || 5;
            self.columns = configuration.columns;
            self.detail = configuration.detail || false;
            self.detailNode = configuration.detailNode || "";
            self.detailMethod = configuration.detailMethod || "";
            self.detailColumns = configuration.detailColumns;

            // ensure column configuration is correct
            columnsCheck(configuration, self.columns);

            if (self.detail) {
                columnsCheck(configuration, self.detailColumns);
                // create the expand button item
                var expand = new Object({});
                expand.expandButton = true;
                expand.headerText = "";
                self.columns.splice(0, 0, expand);
            }

            self.itemsOnCurrentPage = ko.computed(function () {
                if (self.pager) {
                    var startIndex = self.pageSize * self.currentPageIndex();
                    return ko.unwrap(self.data).slice(startIndex, startIndex + self.pageSize);
                }
                else {
                    return ko.unwrap(self.data);
                }
            }, self);

            self.maxPageIndex = ko.computed(function () {
                return Math.ceil(ko.unwrap(self.data).length / self.pageSize) - 1;
            }, self);

            self.jumpToFirstPage = function() {
                self.currentPageIndex(0);
            };

            self.jumpToLastPage = function() {
                self.currentPageIndex(Math.ceil(ko.unwrap(self.data).length / self.pageSize) - 1);
            };

            self.methodNav = function(data, element, column) {
                var theMethod = window[column.method];
                if(typeof theMethod === 'function') {
                    theMethod(data, element);
                }
            };

            self.expandDetailedGrid = function(data, element) {
                // if the element is loading ignore it
                if (element.type === "readystatechange") {
                    return;
                }
                var item = $(element.currentTarget),
                    icon = $(item[0].children[0]);
                // collapse a detailed grid
                if (icon.hasClass("minus")) {
                    icon.removeClass("minus");
                    icon.addClass("plus");
                    item.parent().next().hide();
                }
                // expand a detailed grid
                else {
                    icon.addClass("minus");
                    icon.removeClass("plus");
                    item.parent().next().show();
                }

                if (self.detailMethod.length > 0) {
                    var theMethod = window[self.detailMethod];
                    if (typeof theMethod === 'function') {
                        theMethod(data, element);
                    }
                }
            };

            self.expandMobileGrid = function(data, element) {
                // if the element is loading ignore it
                if (element.type === "readystatechange") {
                    return;
                }
                var item = $(element.currentTarget);
                item.parent().find(".moreDetail").attr("style", "display: block !important;");
                item.remove();
            };
        }
    };

    // Templates used to render the grid
    var templateEngine = new ko.nativeTemplateEngine();

    templateEngine.addTemplate = function(templateName, templateMarkup) {
        $("head").append("<script type='text/html' id='" + templateName + "'>" + templateMarkup + "<" + "/script>");
    };

    /*jshint multistr: true */
    var pagerTemplate = "\
            <!-- ko if: $root.pager -->\
                <tfoot>\
                    <tr>\
                        <td data-bind=\"attr: { colspan: $root.columns.length }\">\
                            <div class=\"ui small pagination menu\">\
                                <a class=\"icon item\" data-bind=\"click: $root.jumpToFirstPage\">\
                                    <i class=\"left arrow icon\"></i>\
                                </a>\
                                <!-- ko foreach: ko.utils.range(0, maxPageIndex) -->\
                                <a href=\"#\" class=\"item\" data-bind=\"text: $data + 1, click: function() { $root.currentPageIndex($data) }, css: { active: $data == $root.currentPageIndex() }\"></a>\
                                <!-- /ko -->\
                                <a class=\"icon item\" data-bind=\"click: $root.jumpToLastPage\">\
                                    <i class=\"right arrow icon\"></i>\
                                </a>\
                            </div>\
                        </td>\
                    </tr>\
                </tfoot>\
            <!-- /ko -->\
        ";

    /*jshint multistr: true */
    var rowTextTemplate = "\
            <!-- ko if: $data.hasOwnProperty('customTemplate') -->\
                <!-- ko template: customTemplate --><!-- /ko -->\
            <!-- /ko -->\
            <!-- ko if: button && $data.hasOwnProperty('href') -->\
                <a data-bind=\"attr: { 'href': href + (hrefPlaceHolder === '' ? '' : $parent[hrefPlaceHolder]) }\" class=\"fluid ui tiny lgBtnColour button\"><!-- ko text: typeof rowText == 'function' ? rowText($parent) : rowText --><!-- /ko --></a>\
            <!-- /ko -->\
            <!-- ko if: button && $data.hasOwnProperty('method') -->\
                <button data-bind=\"click: function(data,event) {$root.methodNav($parent, event, $data)}\" class=\"fluid ui tiny lgBtnColour button\"><!-- ko text: typeof rowText == 'function' ? rowText($parent) : rowText --><!-- /ko --></button>\
            <!-- /ko -->\
            <!-- ko if: !button && $data.hasOwnProperty('method') -->\
                <a data-bind=\"click: function(data,event) {$root.methodNav($parent, event, $data)}\"><!-- ko text: formatter($data, $parent[rowText]) --><!-- /ko --></a>\
            <!-- /ko -->\
            <!-- ko if: !button && !$data.hasOwnProperty('method') && !$data.hasOwnProperty('customTemplate') -->\
                <!-- ko text: typeof rowText == 'function' ? rowText($parent) : formatter($data, $parent[rowText]) --><!-- /ko -->\
            <!-- /ko -->\
        ";

    /*jshint multistr: true */
    var myTemplate = "\
            <div class=\"computer tablet only row\">\
                <div class=\"ui grid container\">\
                    <table class=\"ui littleGrid compact table\" data-bind=\"css: { detailed: $root.detail }\">\
                        <thead>\
                            <tr data-bind=\"foreach: $root.columns\">\
                               <td data-bind=\"text: headerText, css: $parent.width\"></td>\
                            </tr>\
                        </thead>\
                        <tbody data-bind=\"foreach: $root.itemsOnCurrentPage\">\
                            <tr data-bind=\"foreach: $parent.columns\">\
                                <!-- ko if: $root.detail && expandButton -->\
                                    <td data-bind=\"click: function(data,event) {$root.expandDetailedGrid($parent, event)}\" class=\"one wide\">\
                                        <i class=\"plus icon\"></i>\
                                    </td>\
                                <!-- /ko -->\
                                <!-- ko if: !$root.detail || ($root.detail && !expandButton) -->\
                                    <!-- ko if: $data.hasOwnProperty('colour') -->\
                                        <td data-bind='css: colour($parent)'>" +
                                            rowTextTemplate + "\
                                        </td>\
                                    <!-- /ko -->\
                                    <!-- ko ifnot: $data.hasOwnProperty('colour') -->\
                                        <td>" +
                                            rowTextTemplate + "\
                                        </td>\
                                    <!-- /ko -->\
                                <!-- /ko -->\
                            </tr>\
                            <!-- ko if: $root.detail -->\
                                <tr class=\"moreDetail\">\
                                    <td data-bind=\"attr: { colspan: $root.columns.length }\">\
                                        <div class=\"ui four column equal row grid\">\
                                            <!-- ko foreach: $parent.detailColumns -->\
                                                <!-- ko if: $root.detailNode.length > 0 -->\
                                                    <!-- ko foreach: $parent[$root.detailNode] -->\
                                                        <div class=\"column\">\
                                                            <label data-bind=\"text: $parent.headerText\"></label>\
                                                        </div>\
                                                        <div class=\"column\">\
                                                            <label data-bind=\"text: typeof rowText == 'function' ? rowText($parent) : formatter($parent, $data[$parent.rowText]) \"></label>\
                                                        </div>\
                                                    <!-- /ko -->\
                                                <!-- /ko -->\
                                                <!-- ko if: $root.detailNode.length == 0 -->\
                                                    <!-- ko if: $data.hasOwnProperty('headerText') -->\
                                                        <div class=\"column\">\
                                                            <label data-bind=\"text: headerText\"></label>\
                                                        </div>\
                                                        <div class=\"column\">\
                                                            <label data-bind=\"text: typeof rowText == 'function' ? rowText($parent) : formatter($data, $parent[rowText]) \"></label>\
                                                        </div>\
                                                    <!-- /ko -->\
                                                    <!-- ko if: $data.hasOwnProperty('rowTemplate') -->\
                                                        <div class=\"column row\" data-bind=\"html: rowTemplate\"></div>\
                                                    <!-- /ko -->\
                                                    <!-- ko if: $data.hasOwnProperty('customTemplate') -->\
                                                        <!-- ko template: customTemplate --><!-- /ko -->\
                                                    <!-- /ko -->\
                                                <!-- /ko -->\
                                            <!-- /ko -->\
                                        </div>\
                                    </td>\
                                </tr>\
                            <!-- /ko -->\
                        </tbody>" +
                        pagerTemplate + "\
                    </table>\
                </div>\
            </div>\
            <div class=\"mobile only row\">\
                <div class=\"column\">\
                    <table class=\"ui compact table\">\
                        <tbody data-bind=\"foreach: $root.itemsOnCurrentPage\">\
                            <tr>\
                                <!-- ko foreach: $parent.columns -->\
                                    <!-- ko if: !$root.detail || ($root.detail && !expandButton) -->\
                                        <td>\
                                            <div data-bind=\"text: headerText\"></div>\
                                            <div> " +
                                                rowTextTemplate + "\
                                            </div>\
                                        </td>\
                                    <!-- /ko -->\
                                <!-- /ko -->\
                                <!-- ko if: $root.detail -->\
                                    <td data-bind=\"click: function(data,event) {$root.expandMobileGrid($parent, event)}\" class=\"btnExpandMobile\">\
                                        <p>MORE INFO</p>\
                                    </td>\
                                <!-- /ko -->\
                                <!-- ko foreach: $parent.detailColumns -->\
                                    <!-- ko if: $root.detailNode.length > 0 -->\
                                        <!-- ko foreach: $parent[$root.detailNode] -->\
                                            <td class=\"moreDetail\">\
                                                <div data-bind=\"text: $parent.headerText\"></div>\
                                                <div class=\"column\">\
                                                    <label data-bind=\"text: typeof rowText == 'function' ? rowText($parent) : formatter($parent, $data[$parent.rowText]) \"></label>\
                                                </div>\
                                            </td>\
                                        <!-- /ko -->\
                                    <!-- /ko -->\
                                    <!-- ko if: $root.detailNode.length == 0 -->\
                                        <td class=\"moreDetail\">\
                                            <!-- ko if: $data.hasOwnProperty('headerText') -->\
                                                <div data-bind=\"text: headerText\"></div>\
                                                <div> " +
                                                    rowTextTemplate + "\
                                                </div>\
                                            <!-- /ko -->\
                                            <!-- ko if: $data.hasOwnProperty('rowTemplate') -->\
                                                <div data-bind=\"html: rowTemplate\"></div>\
                                            <!-- /ko -->\
                                            <!-- ko if: $data.hasOwnProperty('customTemplate') -->\
                                                <!-- ko template: customTemplate --><!-- /ko -->\
                                            <!-- /ko -->\
                                        </td>\
                                    <!-- /ko -->\
                                <!-- /ko -->\
                            </tr>\
                        </tbody>" +
                        pagerTemplate + "\
                    </table>\
                </div>\
            </div>\
        ";


    templateEngine.addTemplate("littleGrid", myTemplate);

    // The "littleGrid" binding
    ko.bindingHandlers.littleGrid = {
        init: function() {
            return { 'controlsDescendantBindings': true };
        },
        // This method is called to initialize the node, and will also be called again if you change what the grid is bound to
        update: function (element, viewModelAccessor, allBindings) {
            var viewModel = viewModelAccessor();

            // Empty the element
            while(element.firstChild)
                ko.removeNode(element.firstChild);

            // Allow the default templates to be overridden
            var gridTemplateName = allBindings.get('littleGridTemplate') || "littleGrid";

            // Render the main grid
            var gridContainer = element.appendChild(document.createElement("DIV"));
            ko.renderTemplate(gridTemplateName, viewModel, { templateEngine: templateEngine }, gridContainer, "replaceNode");
        }
    };
})();

function columnsCheck(configuration, columns) {
    // ensure column configuration is correct
    for (var index in columns) {
        var column = columns[index];
        // only add the expand button if the detail setting is true
        if (configuration.detail) {
            column.expandButton = false;
        }
        // check to see that the button configuration is there
        if (column.button === undefined) {
            column.button = false;
        }
        // check to see that the width configuration is there
        if (column.width === undefined) {
            column.width = "";
        }
        // if there is a href on the column we need to see if there are placeholders that need replacing
        if (column.href !== undefined) {
            var href = column.href;
            column.hrefPlaceHolder = ""; // default placeholder will be an empty string
            // dynamically replace placeholder with value from items
            if (href.indexOf("{") > 0 && href.indexOf("}") > 0) {
                var placeholder = href.substring(href.indexOf("{") + 1, href.indexOf("}"));
                column.href = href.replace("{" + placeholder + "}", "");
                column.hrefPlaceHolder = placeholder;
            }
        }
    }
}

/**
 * This method checks which columns data needs to be formatted on the grid while binding
 *
 * @param column
 * @param value
 * @returns {*}
 */
function formatter(column, value) {
    if (!value || value === null || value.toString().toUpperCase() === "NULL" || value.toString().trim().length === 0) {
        return "-";
    }

    if (column.money) {
        return currencyFormatter("R", value);
    }
    else if (column.dateFormat !== undefined && column.displayFormat !== undefined) {
        return moment(value, column.dateFormat).format(column.displayFormat);
    }

    return value;
}

function currencyFormatter(currencySymbol, value) {

    if (currencySymbol) {
        if(value === ' '){
            return "-";
        }else{
            var num = numberFormat(value);

            if (num === "-"){
                return num;
            }else{
                return currencySymbol + " " + num;
            }
        }

    } else {

        return numberFormat(value);

    }

}

function numberFormat(value) {

    if (value) {

        var strippedNumber = stripNumber(value);

        if (isNumber(value)) {

            var num = Number(strippedNumber);
            num = num.toFixed(2);

            return num;

        } else {

            return "-";

        }

    } else {

        return "-";

    }

}

function stripNumber(n) {

    if (n && !isNumber(n)) {
        var numberToStrip = n.trim();

        var x = 0;

        while (!isNumber(numberToStrip[x])) {

            numberToStrip = numberToStrip.substring(x, numberToStrip.length);
            x++;

        }

        return numberToStrip.trim();
    } else {
        return n;
    }

}

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}
