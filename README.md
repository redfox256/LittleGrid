# LittleGrid
Little grid built using Knockout and Semantic-UI
The grid was designed to be light, simple and easy to use with minimal code to setup.

### Required Libraries
1. [Semantic-UI 2.x.x](http://www.semantic-ui.com/)
2. [Knockout.js](http://knockoutjs.com/)
3. [Moment.js](http://momentjs.com/) - Optional

## Lets get started with an example
Setup your model which tells little grid how to render the grid.

```javascript
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
```

Setup your html to bind your model to a container
```html
<div id="user">
    <div data-bind='littleGrid: myModal' class="ui grid tableData"></div>
</div>
```

OR if you only want to bind it to the grid
```html
<div id="user" data-bind='littleGrid: myModal' class="ui grid tableData"></div>
```

Setting up a custom template
```html
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
```

```
date - JsonArray
pager - booelan (default false) >> add a pager to the bottom of your grid
pageSize - integer (default 5) >> specify how many items you want to show on each page > only takes affect if the pager setting is true
columns - JsonArray
    > headerText - varchar >> table header text
    > rowText - varchar || function >> table column text which is auto formatted to replace empty values with dashes "-"
    > money - boolean (default false) >> format rowText to R #.##
    > dateFormat - varchar >> parse your date in your data object before using displayFormat
    > dispayFormat - varchar >> format your date - refer to moment.hs site for examples
    > button - boolean (default false) >> displaya button instead of text
    > href - varchar >> your button href location > only takes affect if button is true
    > method - varchar >> function to be called when button is clicked. params passed to function "data", "element" > if button is not set and method is set the label will be a hyperlink
    > colour - function >> this function must return a json object > refer to example below for example, this example is based on knockout's logic
    > width - varchar >> this uses semantic-ui grid system, refer to there documentation or in the example above.
detail - boolean (default false) >> turn the grid into a detailed grid which can expand
detailNode - varchar (default empty string) >> specify if your data used in the detailed section is nested in the JsonArray
detailMethod - varchar (default empty string) >> refer to "columns" > "method", action is triggered on expand
detailColumns - refer to "columns"
    > rowTemplate - varchar (html) >> adds html code to your grid for better customization > the world is your oyster as to what you add - have fun
    > customTemplate - JsonNode >> should you require binding and more control which the rowTemplate cannot offer use a customTemplate
```