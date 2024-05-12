/**
 * Autocomplete
 * Copyright 2024 Abel Brencsan
 * Released under the MIT License
 */
const Autocomplete = function(options) {

	'use strict';

	// Test required options
	if (!(options.input instanceof HTMLElement)) {
		throw 'Autocomplete "input" must be an `HTMLElement`';
	}
	if (typeof options.getSuggestions !== 'function') {
		throw 'Autocomplete "getSuggestions" must be a `function`';
	}
	if (typeof options.renderItem !== 'function') {
		throw 'Autocomplete "renderItem" must be a `function`';
	}
	if (typeof options.inputValueOnSelect !== 'function') {
		throw 'Autocomplete "inputValueOnSelect" must be a `function`';
	}
	if (typeof options.inputValueOnHighlight !== 'function') {
		throw 'Autocomplete "inputValueOnHighlight" must be a `function`';
	}

	// Default autocomplete instance options
	let defaults = {
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
		submitCallback: null,
		destroyCallback: null,
		isOpenedClass: 'is-opened',
		hasAutocompleteClass: 'has-autocomplete',
		isHighlightedClass: 'is-highlighted'
	};

	// Extend autocomplete instance options with defaults
	for (let key in defaults) {
		this[key] = (options.hasOwnProperty(key)) ? options[key] : defaults[key];
	}

	// Autocomplete instance variables
	this.suggestions = [];
	this.areSuggestionsInitialized = false;
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

	let autocomplete = {

		/**
		 * Initialize autocomplete.
		 * It creates and appends autocomplete to the DOM and adds related events and attributes.
		 * 
		 * @public
		 */
		init: function() {
			if (this.isInitialized) return;
			autocomplete.createList.call(this);
			this.handleEvent = function(event) {
				autocomplete.handleEvents.call(this, event);
			};
			this.input.setAttribute('autocomplete','off');
			this.input.setAttribute('autocorrect','off');
			this.input.setAttribute('autocapitalize','off');
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
		 * Create autocomplete, append it to input's parent element.
		 * 
		 * @private
		 */
		createList: function() {
			this.list = document.createElement('ul');
			for (let i = 0; i < this.listClasses.length; i++) {
				this.list.classList.add(this.listClasses[i]);
			}
			this.list.setAttribute('tabindex', -1);
			this.list.setAttribute('unselectable', 'on');
			this.input.parentNode.appendChild(this.list);
		},

		/**
		 * Open autocomplete if suggestion items are set.
		 * 
		 * @private
		 */
		openList: function() {
			if (!this.suggestions.length) return;
			this.isOpened = true;
			this.list.classList.add(this.isOpenedClass);
			this.input.classList.add(this.hasAutocompleteClass);
			if (this.openCallback) this.openCallback.call(this);
		},

		/**
		 * Close autocomplete.
		 * 
		 * @private
		 */
		closeList: function() {
			this.isOpened = false;
			this.list.classList.remove(this.isOpenedClass);
			this.input.classList.remove(this.hasAutocompleteClass);
			if (this.closeCallback) this.closeCallback.call(this);
		},

		/**
		 * Set scroll position of autocomplete to always see currently highlighted suggestion item.
		 * 
		 * @private
		 */
		setListScrollPosition: function() {
			if (this.highlightedSuggestionIndex === null) {
				this.list.scrollTop = 0;
			}
			else {
				let item = this.items[this.highlightedSuggestionIndex];
				if (item.offsetTop + item.offsetHeight > this.list.scrollTop + this.list.offsetHeight) {
					this.list.scrollTop = (item.offsetTop - this.list.offsetHeight) + item.offsetHeight;
				}
				else if (item.offsetTop < this.list.scrollTop) {
					this.list.scrollTop = item.offsetTop;
				}
			}
		},

		/**
		 * Append suggestion items to autocomplete as a fragment.
		 * 
		 * @private
		 */
		createItemsFromSuggestions: function() {
			let fragment = document.createDocumentFragment();
			autocomplete.resetItems.call(this);
			for (let i = 0; i < this.suggestions.length; i++) {
				this.items[i] = document.createElement('li');
				for (let j = 0; j < this.itemClasses.length; j++) {
					this.items[i].classList.add(this.itemClasses[j]);
				}
				this.items[i].innerHTML = this.renderItem(this.suggestions[i], this.input.value);
				fragment.appendChild(this.items[i]);
			}
			this.list.appendChild(fragment);
		},

		/**
		 * Remove suggestion items from autocomplete.
		 * 
		 * @private
		 */
		resetItems: function() {
			this.items = [];
			while (this.list.firstChild) {
				this.list.removeChild(this.list.firstChild);
			}
		},

		/**
		 * Reset suggestions.
		 * Set selected and highlighted suggestion's index to null.
		 * 
		 * @private
		 */
		resetSuggestions: function() {
			this.suggestions = [];
			this.selectedSuggestionIndex = null;
			this.highlightedSuggestionIndex = null;
		},

		/**
		 * Call "getSuggestions" to set suggestions when minimum number of characters are reached.
		 * 
		 * @private
		 */
		setSuggestions: function() {
			this.areSuggestionsInitialized = true;
			this.oldInput = null;
			if (this.input.value.length < this.minChars) {
				autocomplete.resetSuggestions.call(this);
				autocomplete.resetItems.call(this);
				autocomplete.closeList.call(this);
				clearTimeout(this.timeout);
			}
			else {
				clearTimeout(this.timeout);
				this.timeout = setTimeout(() => {
					autocomplete.resetSuggestions.call(this);
					this.getSuggestions(this.input.value, (suggestions) => {
						this.list.scrollTop = 0;
						if (this.input.value.length >= this.minChars) {
							this.suggestions = suggestions;
							if (this.suggestions.length) {
								if (this.maxSuggestions) this.suggestions = this.suggestions.slice(0, this.maxSuggestions);
								autocomplete.createItemsFromSuggestions.call(this);
								if (document.activeElement === this.input) {
									autocomplete.openList.call(this);
								}
							}
							else {
								autocomplete.resetItems.call(this);
								autocomplete.closeList.call(this);
							}
						}
					});
				}, this.delay);
			}
		},

		/**
		 * Select highlighted suggestion item.
		 * 
		 * @private
		 */
		selectHighlightedItem: function() {
			if (this.highlightedSuggestionIndex !== null) {
				autocomplete.selectItemByIndex.call(this, this.highlightedSuggestionIndex);
			}
		},

		/**
		 * Select suggestion item by given index.
		 * 
		 * @private
		 * @param {number} index
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
		 * Increment highlighted suggestion item's index by one and highlight it.
		 * 
		 * @private
		 */
		highlightNextItem: function() {
			if (!this.suggestions.length) return;
			if (!this.isOpened) autocomplete.openList.call(this);
			let index;
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
		 * Decrement highlighted suggestion item's index by one and highlight it.
		 * 
		 * @private
		 */
		highlightPrevItem: function() {
			if (!this.suggestions.length) return;
			if (!this.isOpened) autocomplete.openList.call(this);
			let index;
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
		 * Remove old and highlight new suggestion item at given index.
		 * 
		 * @private
		 * @param {number|null} index
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
		 * Remove highlight from currently highlighted suggestion item.
		 * 
		 * @private
		 * @param {number|null} index
		 */
		removeHighlight: function(index) {
			if (this.highlightedSuggestionIndex !== null) {
				this.items[this.highlightedSuggestionIndex].classList.remove(this.isHighlightedClass);
			}
			this.highlightedSuggestionIndex = null;
			if (this.oldInput !== null) {
				this.input.value = this.oldInput;
				this.oldInput = null;
			}
		},

		/**
		 * Handle events.
		 * On item mouse down: select suggestion item.
		 * On item mouse move: highlight suggestion item.
		 * On list mouse leave: remove highlight from currently highlighted element.
		 * On input blur: close list.
		 * On inut focus: get suggestions if they are not set, open list.
		 * On input up or down arrow keydown: highlight next or previous suggestion item.
		 * On input enter keydown: select highlighted suggestion.
		 * On input ESC keyup: remove highlight and close list.
		 * On input every keyup except ESC and arrows: get suggestion.
		 * 
		 * @private
		 * @param {Event} event
		 */
		handleEvents: function(event) {
			switch(event.type) {
				case 'mousedown':
					event.preventDefault();
					for (let i = 0; i < this.items.length; i++) {
						if (this.items[i].contains(event.target) && event.which == 1) {
							autocomplete.selectItemByIndex.call(this, i);
						}
					}
					break;
				case 'mousemove':
					for (let i = 0; i < this.items.length; i++) {
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
						if (!this.areSuggestionsInitialized) {
							autocomplete.setSuggestions.call(this);
						}
						else {
							autocomplete.openList.call(this);
						}
					}
					break;
				case 'keydown':
					if (event.target == this.input) {
						if (event.key == 'ArrowUp') {
							event.preventDefault();
							autocomplete.highlightPrevItem.call(this);
						}
						if (event.key == 'ArrowDown') {
							event.preventDefault();
							autocomplete.highlightNextItem.call(this);
						}
						if (event.key == 'Enter') {
							event.preventDefault();
							if (this.highlightedSuggestionIndex !== null) {
								autocomplete.selectHighlightedItem.call(this);
							}
							else {
								if (this.submitCallback) this.submitCallback.call(this);
							}
						}
					}
					break;
				case 'keyup':
					if (event.target == this.input) {
						if (event.key == 'Escape') {
							autocomplete.removeHighlight.call(this);
							autocomplete.closeList.call(this);
						}
						else if (event.key != 'Shift' && event.key != 'Tab' && event.key != 'ArrowLeft' && event.key != 'ArrowUp' && event.key != 'ArrowRight' && event.key != 'ArrowDown') {
							autocomplete.setSuggestions.call(this);
						}
					}
					break;
			}
		},

		/**
		 * Destroy autocomplete.
		 * It removes autocomplete, all related attributes and events,  from the DOM.
		 * 
		 * @public
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
