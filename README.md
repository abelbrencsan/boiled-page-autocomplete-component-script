

# Boiled Page autocomplete component and script

Autocomplete SCSS singleton and script for Boiled Page frontend framework. They are intended to provide suggestions for users as they type.

## Install

Place `_autocomplete.scss` file to `/assets/css/components` directory, and add its path to component block in `assets/css/app.scss` file. 

You will also need to place `autocomplete.js` to `/assets/js` directory and add its path to `scripts` variable in `gulpfile.js` to be combined with other scripts.

## Usage

### Autocomplete component

#### Classes

HTML elements with the following classes are generated by JavaScript when autocomplete is initialized or suggestion items are appended.

Class name | Description | Example
---------- | ----------- | -------
`autocomplete` | Applies autocomplete. | `<ul class="atocomplete"></ul>`
`autocomplete-item` | Applies a suggestion item inside autocomplete. | `<li class="atocomplete-item"></li>`

#### Examples

##### Example 1

The following example shows a search input (uses form components) that show related suggestion items when a keystroke occurs.

```html
<div class="form-item">
  <label class="form-label" for="search">Search</label>
  <input class="form-input" type="text" name="search" id="search" />
</div>
```

Add `autocomplete` property to `app` object in `assets/js/app.js`.

```js
autocomplete: null
```

Place the following code inside `assets/js/app.js` to initialize autocomplete for input with `search` id.

```js
// Initialize search with autocomplete
var searchElem = document.getElementById('search');
var choices = ['ActionScript', 'AppleScript', 'Asp', 'BASIC', 'C', 'C++', 'Clojure', 'COBOL', 'ColdFusion', 'Erlang', 'Fortran', 'Groovy', 'Haskell', 'Java', 'JavaScript', 'Lisp', 'Perl', 'PHP', 'Python', 'Ruby', 'Scala', 'Scheme'];
app.autocomplete = new Autocomplete({
  input: searchElem,
  getSuggestions: function(term, callback) {
    term = term.toLowerCase();
    var suggestions = [];
    for (i = 0; i < choices.length; i++) {
      if (~choices[i].toLowerCase().indexOf(term)) suggestions.push(choices[i]);
    }
    callback(suggestions);
  },
  renderItem: function(suggestion, term) {
    var re = new RegExp('(' + term.split(' ').join('|') + ')', 'gi');
    return suggestion.replace(re, '<span class="is-marked">$1</span>');
  },
  inputValueOnSelect: function(suggestion, term) {
    return suggestion;
  },
  inputValueOnHighlight: function(suggestion, term) {
    return suggestion;
  }
});
app.autocomplete.init();
```

### Autocomplete script

#### Usage

To create a new autocomplete instance, call `Autocomplete` constructor the following way:

```js
// Create new autocomplete instance
var autocomplete = new Autocomplete(options);

// Initialize autocomplete instance
autocomplete.init();
```

#### Options

The following options are available for autocomplete constructor:

Option| Type | Default | Required | Description
------|------|---------|----------|------------
`input` | Object | null | Yes | Value of given input element is used as the search term to get suggestions when a keystroke occurs.
`getSuggestions` | Function | null | Yes | Function to get suggestions from search term.
`renderItem` | Function | null | Yes | Function to define how a suggestion is displayed.
`inputValueOnSelect` | Function | null | Yes | Function to define input value when a suggestion item is selected.
`inputValueOnHighlight` | Function | null | Yes | Function to modify input value when a suggestion item is highlighted.
`minChars` | Number | 1 | No | Minimum number of characters that must be typed before search is performed (`getSuggestions` is called).
`delay` | Number | 300 | No | Number of milliseconds between a keystroke occurs and search is performed (`getSuggestions` is called).
`maxSuggestions` | Number | null | No | Maximum number of appended suggestions.
`listClasses` | Array | ['autocomplete'] | No | Array of classes added to autocomplete on initialization.
`itemClasses` | Array | [] | No | Array of classes added to a suggestion item when it is appended to autocomplete.
`initCallback` | Function | null | No | Callback function after autocomplete is initialized.
`openCallback` | Function | null | No | Callback function after autocomplete is opened.
`closeCallback` | Function | null | No | Callback function after autocomplete is closed.
`selectCallback` | Function | null | No | Callback function after a suggestion item is selected.
`submitCallback` | Function | null | No | Callback function after enter is pressed.
`highlightCallback` | Function | null | No | Callback function after a suggestion item is highlighted.
`destroyCallback` | Function | null | No | Callback function after autocomplete is destroyed.
`isOpenedClass` | String | 'is-opened' | No | Class added to autocomplete when it is opened.
`hasAutocompleteClass` | String | 'has-autocomplete' | No | Class added to input when it is opened.
`isHighlightedClass` | String | 'is-highlighted' | No | Class added to a suggestion item when it is highlighted.

##### Arguments for user-defined functions

`getSuggestions(term, callback)` gets the following arguments:

Parameter | Description
----------|------------
`term` | Search term that can be used to filter suggestions.
`callback` | Callback function called after suggestions are defined. It expects an array of suggestions those will be appended to autocomplete.

`renderItem(suggestion, term)` gets the following arguments:

Parameter | Description
----------|------------
`suggestion` | An item of suggestion array.
`term` | Search term that can be used to highlight typed part of a suggestion.

`inputValueOnSelect(suggestion, term)` gets the following arguments:

Parameter | Description
----------|------------
`suggestion` | Selected item of suggestion array.
`term` | Search term. If you do not want to manipulate input value when a suggestion item is selected, return with the value of it.

`inputValueOnHighlight(suggestion, term)` gets the following arguments:

Parameter | Description
----------|------------
`suggestion` | Highlighted item of suggestion array.
`term` | Search term. If you do not want to manipulate input value when a suggestion item is highlighted, return with the value of it.

#### Methods

##### Initialize autocomplete

`init()` - Initialize autocomplete.

##### Destroy autocomplete 

`destroy()` - Destroy autocomplete.

