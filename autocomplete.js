/**
 * Autocomplete - v1.1.0
 * Copyright 2021 Abel Brencsan
 * Released under the MIT License
 */

var Autocomplete = function(options) {

	'use strict';

	// Test required options
	if (typeof options.input !== 'object') throw 'Autocomplete "input" option must be an object';
	if (typeof options.getSuggestions !== 'function') throw 'Autocomplete "getSuggestions" option must be a function';
	if (typeof options.renderItem !== 'function') throw 'Autocomplete "renderItem" option must be a function';
	if (typeof options.inputValueOnSelect !== 'function') throw 'Autocomplete "inputValueOnSelect" option must be a function';
	if (typeof options.inputValueOnHighlight !== 'function') throw 'Autocomplete "inputValueOnHighlight" option must be a function';

	// Default autocomplete instance options
	var defaults = {
		input: null,
		getSuggestions: null,
		renderItem: null,
		inputValueOnSelect: null,
		inputValueOnHighlight: null,
		minChars: 1,
		delay: 300,
		maxSuggestions: null,
		listClasses: ['autocomplete'],
		itemClasses: [],
		initCallback: null,
		openCallback: null,
		closeCallback: null,
		selectCallback: null,
		highlightCallback: null,
		destroyCallback: null,
		isOpenedClass: 'is-opened',
		hasAutocompleteClass: 'has-autocomplete',
		isHighlightedClass: 'is-highlighted'
	};

	// Extend autocomplete instance options with defaults
	for (var key in defaults) {
		this[key] = (options.hasOwnProperty(key)) ? options[key] : defaults[key];
	}

	// Autocomplete instance variables
	this.suggestions = [];
	this.suggestionsAreInitialized = false;
	this.selectedSuggestionIndex = null;
	this.highlightedSuggestionIndex = null;
	this.list = null;
	this.items = [];
	this.oldInput = null;
	this.isInitialized = false;
	this.isOpened = false;
	this.timeout = null;

};

Autocomplete.prototype = function () {

	'use strict';

	var autocomplete = {

		/**
		 * Initialize autocomplete. It creates and appends autocomplete to the DOM, adds related events and attributes. (public)
		 */
		init: function() {
			if (this.isInitialized) return;
			autocomplete.createList.call(this);
			this.input.setAttribute('autocomplete','off');
			this.input.setAttribute('autocorrect','off');
			this.input.setAttribute('autocapitalize','off');
			this.handleEvent = function(event) {
				autocomplete.handleEvents.call(this, event);
			};
			this.input.addEventListener('blur', this);
			this.input.addEventListener('focus', this);
			this.input.addEventListener('keydown', this);
			this.input.addEventListener('keyup', this);
			this.list.addEventListener('mousedown', this);
			this.list.addEventListener('mouseleave', this);
			this.list.addEventListener('mousemove', this);
			this.isInitialized = true;
			if (this.initCallback) this.initCallback.call(this);
		},

		/**
		 * Create autocomplete, append it to input's parent element (private)
		 */
		createList: function() {
			this.list = document.createElement('ul');
			for (var i = 0; i < this.listClasses.length; i++) {
				this.list.classList.add(this.listClasses[i]);
			}
			this.list.setAttribute('tabindex', -1);
			this.list.setAttribute('unselectable', 'on');
			this.input.parentNode.appendChild(this.list);
		},

		/**
		 * Open autocomplete if suggestion items are set. (private)
		 */
		openList: function() {
			if (!this.suggestions.length) return;
			this.isOpened = true;
			this.list.classList.add(this.isOpenedClass);
			this.input.classList.add(this.hasAutocompleteClass);
			if (this.openCallback) this.openCallback.call(this);
		},

		/**
		 * Close autocomplete. (private)
		 */
		closeList: function() {
			this.isOpened = false;
			this.list.classList.remove(this.isOpenedClass);
			this.input.classList.remove(this.hasAutocompleteClass);
			if (this.closeCallback) this.closeCallback.call(this);
		},

		/**
		 * Set scroll position of autocomplete to always see currently highlighted suggestion item. (private)
		 */
		setListScrollPosition: function() {
			if (this.highlightedSuggestionIndex === null) {
				this.list.scrollTop = 0;
			}
			else {
				if (this.items[this.highlightedSuggestionIndex].offsetTop + this.items[this.highlightedSuggestionIndex].offsetHeight > this.list.scrollTop + this.list.offsetHeight) {
					this.list.scrollTop = (this.items[this.highlightedSuggestionIndex].offsetTop - this.list.offsetHeight) + this.items[this.highlightedSuggestionIndex].offsetHeight;
				}
				else if (this.items[this.highlightedSuggestionIndex].offsetTop < this.list.scrollTop) {
					this.list.scrollTop = this.items[this.highlightedSuggestionIndex].offsetTop;
				}
			}
		},

		/**
		 * Append suggestion items to autocomplete as a fragment. (private)
		 */
		createItemsFromSuggestions: function() {
			var fragment = document.createDocumentFragment();
			autocomplete.resetItems.call(this);
			for (var i = 0; i < this.suggestions.length; i++) {
				this.items[i] = document.createElement('li');
				for (var j = 0; j < this.itemClasses.length; j++) {
					this.items[i].classList.add(this.itemClasses[j]);
				}
				this.items[i].innerHTML = this.renderItem(this.suggestions[i], this.input.value);
				fragment.appendChild(this.items[i]);
			}
			this.list.appendChild(fragment);
		},

		/**
		 * Remove suggestion items from autcomplete. (private)
		 */
		resetItems: function() {
			this.items = [];
			while (this.list.firstChild) {
				this.list.removeChild(this.list.firstChild);
			}
		},

		/**
		 * Reset suggestions, set selected and highlighted suggestion's index to null. (private)
		 */
		resetSuggestions: function() {
			this.suggestions = [];
			this.selectedSuggestionIndex = null;
			this.highlightedSuggestionIndex = null;
		},

		/**
		 * Call "getSuggestions" to set suggestions when minimum number of characters are reached.  (private)
		 */
		setSuggestions: function() {
			this.suggestionsAreInitialized = true;
			this.oldInput = null;
			if (this.input.value.length < this.minChars) {
				autocomplete.resetSuggestions.call(this);
				autocomplete.resetItems.call(this);
				autocomplete.closeList.call(this);
				clearTimeout(this.timeout);
			}
			else {
				var that = this;
				clearTimeout(this.timeout);
				this.timeout = setTimeout(function() {
					autocomplete.resetSuggestions.call(that);
					that.getSuggestions(that.input.value, function(suggestions) {
						that.list.scrollTop = 0;
						if (that.input.value.length >= that.minChars) {
							that.suggestions = suggestions;
							if (that.suggestions.length) {
								if (that.maxSuggestions) that.suggestions = that.suggestions.slice(0, that.maxSuggestions);
								autocomplete.createItemsFromSuggestions.call(that);
								if (document.activeElement === that.input) {
									autocomplete.openList.call(that);
								}
							}
							else {
								autocomplete.resetItems.call(that);
								autocomplete.closeList.call(that);
							}
						}
					});
				}, this.delay);
			}
		},

		/**
		 * Select highlighted suggestion item. (private)
		 */
		selectHighlightedItem: function() {
			if (this.highlightedSuggestionIndex !== null) autocomplete.selectItemByIndex.call(this, this.highlightedSuggestionIndex);
		},

		/**
		 * Select suggestion item by given index. (private)
		 * @param index integer
		 */
		selectItemByIndex: function(index) {
			if (typeof this.suggestions[index] == 'undefined') return;
			autocomplete.removeHighlight.call(this);
			this.selectedSuggestionIndex = index;
			this.list.scrollTop = 0;
			this.input.value = this.inputValueOnSelect.call(this, this.suggestions[index], this.input.value);
			if (this.selectCallback) this.selectCallback.call(this);
			autocomplete.resetSuggestions.call(this);
			autocomplete.resetItems.call(this);
			autocomplete.closeList.call(this);
		},

		/**
		 * Increment highlighted suggestion item's index by one and highlight it. (private)
		 */
		highlightNextItem: function() {
			if (!this.suggestions.length) return;
			if (!this.isOpened) autocomplete.openList.call(this);
			var index;
			if (this.highlightedSuggestionIndex === null) {
				index = 0;
			}
			else if (this.highlightedSuggestionIndex >= this.suggestions.length - 1) {
				index = null;
			}
			else {
				index = this.highlightedSuggestionIndex + 1;
			}
			autocomplete.highlightItemByIndex.call(this, index);
			autocomplete.setListScrollPosition.call(this);
		},

		/**
		 * Decrement highlighted suggestion item's index by one and highs. (private)
		 */
		highlightPrevItem: function() {
			if (!this.suggestions.length) return;
			if (!this.isOpened) autocomplete.openList.call(this);
			var index;
			if (this.highlightedSuggestionIndex === null) {
				index = this.suggestions.length - 1;
			}
			else if (this.highlightedSuggestionIndex == 0) {
				index = null;
			}
			else {
				index = this.highlightedSuggestionIndex - 1;
			}
			autocomplete.highlightItemByIndex.call(this, index);
			autocomplete.setListScrollPosition.call(this);
		},

		/**
		 * Remove previous and highlight new suggestion item with given index. (private)
		 * @param index integer|null
		 */
		highlightItemByIndex: function(index) {
			autocomplete.removeHighlight.call(this);
			if (index !== null && typeof this.suggestions[index] != 'undefined') {
				if (this.oldInput === null) this.oldInput = this.input.value;
				this.input.value = this.inputValueOnHighlight.call(this, this.suggestions[index], this.input.value);
				this.items[index].classList.add(this.isHighlightedClass);
				this.highlightedSuggestionIndex = index;
				if (this.highlightCallback) this.highlightCallback.call(this);
			}
		},

		/**
		 * Remove highlight from currently highlighted suggestion item. (private)
		 * @param index integer|null
		 */
		removeHighlight: function(index) {
			if (this.highlightedSuggestionIndex !== null) this.items[this.highlightedSuggestionIndex].classList.remove(this.isHighlightedClass);
			this.highlightedSuggestionIndex = null;
			if (this.oldInput !== null) {
				this.input.value = this.oldInput;
				this.oldInput = null;
			}
		},

		/**
		 * Handle events. (private)
		 * On item mouse down: select suggestion item.
		 * On item mouse move: highlight suggestion item.
		 * On list mouse leave: remove highlight from currently highlighted element.
		 * On input blur: close list.
		 * On inut focus: get suggestions if they are not set, open list.
		 * On input up or down arrow keydown: highlight next or previous suggestion item.
		 * On input enter keydown: select highlighted suggestion.
		 * On input ESC keyup: remove highlight and close list.
		 * On input every keyup except ESC and arrows: get suggestion.
		 * @param event object
		 */
		handleEvents: function(event) {
			switch(event.type) {
				case 'mousedown':
					event.preventDefault();
					for (var i = 0; i < this.items.length; i++) {
						if (this.items[i].contains(event.target) && event.which == 1) {
							autocomplete.selectItemByIndex.call(this, i);
						}
					}
					break;
				case 'mousemove':
					for (var i = 0; i < this.items.length; i++) {
						if (this.items[i].contains(event.target)) {
							autocomplete.highlightItemByIndex.call(this, i);
						}
					}
					break;
				case 'mouseleave':
					if (this.list.contains(event.target)) {
						autocomplete.removeHighlight.call(this);
					}
					break;
				case 'blur':
					if (event.target == this.input) {
						autocomplete.removeHighlight.call(this);
						autocomplete.closeList.call(this);
					}
					break;
				case 'focus':
					if (event.target == this.input) {
						if (!this.suggestionsAreInitialized) {
							autocomplete.setSuggestions.call(this);
						}
						else {
							autocomplete.openList.call(this);
						}
					}
					break;
				case 'keydown':
					if (event.target == this.input) {
						if (event.keyCode == 38) {
							event.preventDefault();
							autocomplete.highlightPrevItem.call(this);
						}
						if (event.keyCode == 40) {
							event.preventDefault();
							autocomplete.highlightNextItem.call(this);
						}
						if (event.keyCode == 13) {
							event.preventDefault();
							autocomplete.selectHighlightedItem.call(this);
						}
					}
					break;
				case 'keyup':
					if (event.target == this.input) {
						if (event.keyCode == 27) {
							autocomplete.removeHighlight.call(this);
							autocomplete.closeList.call(this);
						}
						else if (event.keyCode != 16 && event.keyCode != 9 && event.keyCode != 37 && event.keyCode != 38 && event.keyCode != 39 && event.keyCode != 40) {
							autocomplete.setSuggestions.call(this);
						}
					}
					break;
			}
		},

		/**
		 * Destroy autocomplete. It removes all related attributes and events, autocomplete from the DOM. (public)
		 */
		destroy: function() {
			if (!this.isInitialized) return;
			this.input.removeAttribute('autocomplete');
			this.input.removeAttribute('autocorrect');
			this.input.removeAttribute('autocapitalize');
			this.input.removeEventListener('blur', this);
			this.input.removeEventListener('focus', this);
			this.input.removeEventListener('keydown', this);
			this.input.removeEventListener('keyup', this);
			this.list.removeEventListener('mousedown', this);
			this.list.removeEventListener('mouseleave', this);
			this.list.removeEventListener('mousemove', this);
			autocomplete.resetItems.call(this);
			autocomplete.resetSuggestions.call(this);
			this.oldInput = null;
			this.isOpened = false;
			this.timeout = null;
			this.isInitialized = false;
			this.list.parentNode.removeChild(this.list);
			if (this.destroyCallback) this.destroyCallback.call(this);
		}
	};

	return {
		init: autocomplete.init,
		destroy: autocomplete.destroy
	};

}();
