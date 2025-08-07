(
    function ($)
    {
        var AbstractChosen, Chosen, SelectParser,
            bind    = function(fn   , me    ) { return function(){ return fn.apply(me, arguments); }; },
            extend  = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
            hasProp = {}.hasOwnProperty;

        SelectParser = (
            function()
            {
                function SelectParser()
                {
                    this.options_index = 0;
                    this.parsed        = [];
                }

                SelectParser.prototype.add_node = function(child)
                {
                    if (child.nodeName.toUpperCase() === "OPTGROUP")
                    {
                        return this.add_group(child);
                    }
                    else
                    {
                        return this.add_option(child);
                    }
                };

                SelectParser.prototype.add_group = function(group) {
                    var group_position, i, len, option, ref, results1;
                    group_position = this.parsed.length;
                    this.parsed.push({
                        array_index: group_position,
                        group      : true,
                        label      : group.label,
                        title      : group.title ? group.title : void 0,
                        children   : 0,
                        disabled   : group.disabled,
                        classes    : group.className
                    });
                    ref      = group.childNodes;
                    results1 = [];
                    for (i = 0, len = ref.length; i < len; i++)
                    {
                        option = ref[i];
                        results1.push(this.add_option(option, group_position, group.disabled));
                    }
                    return results1;
                };

                SelectParser.prototype.add_option = function(option, group_position, group_disabled) {
                    if (option.nodeName.toUpperCase() === "OPTION") {
                        if (option.text !== "") {
                            if (group_position != null) {
                                this.parsed[group_position].children += 1;
                            }
                            this.parsed.push({
                                array_index      : this.parsed.length,
                                options_index    : this.options_index,
                                value            : option.value,
                                text             : option.text,
                                html             : option.innerHTML,
                                title            : option.title ? option.title : void 0,
                                selected         : option.selected,
                                disabled         : group_disabled === true ? group_disabled : option.disabled,
                                group_array_index: group_position,
                                group_label      : group_position != null ? this.parsed[group_position].label : null,
                                classes          : option.className,
                                style            : option.style.cssText
                            });
                        } else {
                            this.parsed.push({
                                array_index  : this.parsed.length,
                                options_index: this.options_index,
                                empty        : true
                            });
                        }
                        return this.options_index += 1;
                    }
                };

                return SelectParser;

            }
        )();

        SelectParser.select_to_array = function(select) {
            var child, i, len, parser, ref;
            parser = new SelectParser();
            ref    = select.childNodes;
            for(i = 0, len = ref.length; i < len; i++)
            {
                child = ref[i];
                parser.add_node(child);
            }
            return parser.parsed;
        };

        AbstractChosen = (
            function()
            {
                function AbstractChosen(form_field, options1)
                {
                    var ref, i, len, option, value, text, matches;
                    ref = form_field.options;
                    for (i = 0, len = ref.length; i < len; i++)
                    {
                        option = ref[ i ];

                        value = option.value;
                        matches = value.match( /^(.+)\[(\d+)\]$/ );
                        if( matches != null && matches.length > 2 )
                        {
                            if( parseInt( matches[ 2 ], 10 ) >= 0 )
                            {
                                value = matches[ 1 ];
                                option.value = value.trim();
                            }
                        }
                        else
                        {
                            option.value = value.trim();
                        }

                        text = option.text;
                        matches = text.match( /^(.+)\[(\d+)\]$/ );
                        if( matches != null && matches.length > 2 )
                        {
                          if( parseInt( matches[ 2 ], 10 ) >= 0 )
                          {
                            text = matches[ 1 ];
                            option.text = text.trim();
                          }
                        }
                        else
                        {
                          option.text = text.trim();
                        }
                    }

                    this.form_field = form_field;
                    this.options = options1 != null ? options1 : {};
                    this.label_click_handler = bind(this.label_click_handler, this);
                    if (!AbstractChosen.browser_is_supported()) {
                        return;
                    }
                    this.is_multiple = this.form_field.multiple;
                    this.set_default_text();
                    this.set_default_values();
                    this.setup();
                    this.set_up_html();
                    this.register_observers();
                    this.on_ready();
                }

                AbstractChosen.prototype.set_default_values = function() {
                    this.timer        = null;
                    this.uri          = window.location.protocol + '//' + window.location.hostname + '/index.php?q=autocomplete_fulltextsearch/0/20';
                    this.searchString = '';
                    this.popup        = null;
                    this.delay        = 100;
                    this.ajax_started = false;

                    this.click_test_action = (function(_this) {
                        return function(evt) {
                            return _this.test_active_click(evt);
                        };
                    })(this);

                    this.activate_action = (function(_this) {
                        return function(evt) {
                            return _this.activate_field(evt);
                        };
                    })(this);

                    this.active_field       = false;
                    this.mouse_on_container = false;
                    this.results_showing    = false;
                    this.result_highlighted = null;
                    this.is_rtl             = this.options.rtl || /\bchosen-rtl\b/.test(this.form_field.className);
                    this.allow_single_deselect    = (this.options.allow_single_deselect != null) && (this.form_field.options[0] != null) && this.form_field.options[0].text === "" ? this.options.allow_single_deselect : false;
                    this.disable_search_threshold = this.options.disable_search_threshold || 0;
                    this.disable_search           = this.options.disable_search || false;
                    this.enable_split_word_search = this.options.enable_split_word_search != null ? this.options.enable_split_word_search : true;
                    this.group_search             = this.options.group_search != null ? this.options.group_search : true;
                    this.search_contains          = this.options.search_contains || false;
                    this.single_backstroke_delete = this.options.single_backstroke_delete != null ? this.options.single_backstroke_delete : true;
                    this.max_selected_options     = this.options.max_selected_options || Infinity;
                    this.inherit_select_classes   = this.options.inherit_select_classes || false;
                    this.display_selected_options = this.options.display_selected_options != null ? this.options.display_selected_options : true;
                    this.display_disabled_options = this.options.display_disabled_options != null ? this.options.display_disabled_options : true;
                    this.include_group_label_in_selected = this.options.include_group_label_in_selected || false;
                    this.max_shown_results        = this.options.max_shown_results || Number.POSITIVE_INFINITY;
                    this.case_sensitive_search    = this.options.case_sensitive_search || false;
                    return this.hide_results_on_select = this.options.hide_results_on_select != null ? this.options.hide_results_on_select : true;
                };

                AbstractChosen.prototype.set_default_text = function() {
                    if (this.form_field.getAttribute("data-placeholder")) {
                        this.default_text = this.form_field.getAttribute("data-placeholder");
                    } else if (this.is_multiple) {
                        this.default_text = this.options.placeholder_text_multiple || this.options.placeholder_text || AbstractChosen.default_multiple_text;
                    } else {
                        this.default_text = this.options.placeholder_text_single || this.options.placeholder_text || AbstractChosen.default_single_text;
                    }
                    this.default_text = this.escape_html(this.default_text);
                    return this.results_none_found = this.form_field.getAttribute("data-no_results_text") || this.options.no_results_text || AbstractChosen.default_no_result_text;
                };

                AbstractChosen.prototype.choice_label = function(item) {
                    if (this.include_group_label_in_selected && (item.group_label != null)) {
                        return "<b class='group-name'>" + (this.escape_html(item.group_label)) + "</b>" + item.html;
                    } else {
                        return item.html;
                    }
                };

                AbstractChosen.prototype.mouse_enter = function() {
                    return this.mouse_on_container = true;
                };

                AbstractChosen.prototype.mouse_leave = function() {
                    return this.mouse_on_container = false;
                };

                AbstractChosen.prototype.input_focus = function(evt) {
                    if (this.is_multiple) {
                        if (!this.active_field) {
                            return setTimeout(((function(_this) {
                                return function() {
                                    return _this.container_mousedown();
                                };
                            })(this)), 50);
                        }
                    } else {
                        if (!this.active_field) {
                            return this.activate_field();
                        }
                    }
                };

                AbstractChosen.prototype.input_blur = function(evt) {
                    if (!this.mouse_on_container) {
                        this.active_field = false;
                        return setTimeout(((function(_this) {
                            return function() {
                                return _this.blur_test();
                            };
                        })(this)), 100);
                    }
                };

                AbstractChosen.prototype.label_click_handler = function(evt) {
                    if (this.is_multiple) {
                        return this.container_mousedown(evt);
                    } else {
                        return this.activate_field();
                    }
                };

                AbstractChosen.prototype.results_option_build = function(options) {
                    var content, data, data_content, i, len, ref, shown_results;
                    content = '';
                    shown_results = 0;
                    ref = this.results_data;
                    for (i = 0, len = ref.length; i < len; i++) {
                        data = ref[i];
                        data_content = '';
                        if (data.group) {
                            data_content = this.result_add_group(data);
                        } else {
                            data_content = this.result_add_option(data);
                        }
                        if (data_content !== '') {
                            shown_results++;
                            content += data_content;
                        }
                        if (options != null ? options.first : void 0) {
                            if (data.selected && this.is_multiple) {
                                this.choice_build(data);
                            } else if (data.selected && !this.is_multiple) {
                                this.single_set_selected_text(this.choice_label(data));
                            }
                        }
                        if (shown_results >= this.max_shown_results) {
                            break;
                        }
                    }
                    //this.edit_links_build();
                    AbstractChosen.update_drupal_ajax( this );

                    return content;
                };

                AbstractChosen.prototype.result_add_option = function(option) {
                    var classes, option_el;
                    if (!option.search_match) {
                        return '';
                    }
                    if (!this.include_option_in_results(option)) {
                        return '';
                    }
                    classes = [];
                    if (!option.disabled && !(option.selected && this.is_multiple)) {
                        classes.push("active-result");
                    }
                    if (option.disabled && !(option.selected && this.is_multiple)) {
                        classes.push("disabled-result");
                    }
                    if (option.selected) {
                        classes.push("result-selected");
                    }
                    if (option.group_array_index != null) {
                        classes.push("group-option");
                    }
                    if (option.classes !== "") {
                        classes.push(option.classes);
                    }
                    option_el = document.createElement("li");
                    option_el.className = classes.join(" ");
                    if (option.style) {
                        option_el.style.cssText = option.style;
                    }
                    option_el.setAttribute("data-option-array-index", option.array_index);
                    option_el.innerHTML = option.highlighted_html || option.html;
                    if (option.title) {
                        option_el.title = option.title;
                    }
                    return this.outerHTML(option_el);
                };

                AbstractChosen.prototype.result_add_group = function(group) {
                    var classes, group_el;
                    if (!(group.search_match || group.group_match)) {
                        return '';
                    }
                    if (!(group.active_options > 0)) {
                        return '';
                    }
                    classes = [];
                    classes.push("group-result");
                    if (group.classes) {
                        classes.push(group.classes);
                    }
                    group_el = document.createElement("li");
                    group_el.className = classes.join(" ");
                    group_el.innerHTML = group.highlighted_html || this.escape_html(group.label);
                    if (group.title) {
                        group_el.title = group.title;
                    }
                    return this.outerHTML(group_el);
                };

                AbstractChosen.prototype.results_update_field = function() {
                    this.set_default_text();
                    if (!this.is_multiple) {
                        this.results_reset_cleanup();
                    }
                    this.result_clear_highlight();
                    this.results_build();
                    if (this.results_showing) {
                        return this.winnow_results();
                    }
                };

                AbstractChosen.prototype.reset_single_select_options = function() {
                    var i, len, ref, result, results1;
                    ref = this.results_data;
                    results1 = [];
                    for (i = 0, len = ref.length; i < len; i++) {
                        result = ref[i];
                        if (result.selected) {
                            results1.push(result.selected = false);
                        } else {
                            results1.push(void 0);
                        }
                    }
                    return results1;
                };

                AbstractChosen.prototype.results_toggle = function() {
                    if (this.results_showing) {
                        return this.results_hide();
                    } else {
                        return this.results_show();
                    }
                };

                AbstractChosen.prototype.results_search = function(evt) {
                    if (this.results_showing) {
                        return this.winnow_results();
                    } else {
                        return this.results_show();
                    }
                };




                AbstractChosen.prototype.select = function (node)
                {
                    var val = $(node).data('autocompleteValue');
                    this.search_field.val( val );

                    // ===========
                    this.add_option_default();

                    if( this.result_highlight )
                    {
                        var high = this.result_highlight;
                            high.removeClass( "active-result"   );
                            high.addClass   ( "result-selected" );
                        var idx  = high[ 0 ].getAttribute( "data-option-array-index" );
                        var item = this.results_data[ idx ];
                            item.selected = true;

                        var ref   = this.form_field.childNodes;
                        var child = ref[ item.options_index ];
                            child.selected = true;
                        //this.form_field.options[item.options_index].selected = true;

                        this.selected_option_count = null;
                        this.choice_build(item);

                        //this.edit_links_build();
                        AbstractChosen.update_drupal_ajax( this );

                        this.result_clear_highlight();
                        this.container.removeClass("chosen-with-drop");

                        this.show_search_field_default();
                        this.trigger_form_field_change(
                            {
                                //selected: this.form_field.options[item.options_index].value
                                selected: child.value
                            }
                        );
                        this.current_selectedIndex = this.form_field.selectedIndex;
                        this.search_field_scale();


                        $(this.search_field).trigger('autocompleteSelect', [node]);
                    }
                };

                AbstractChosen.prototype.selectDown = function () {
                    if (this.selected && this.selected.nextSibling) {
                        this.highlight(this.selected.nextSibling);
                    }
                    else if (this.popup) {
                        var lis = $('li', this.popup);
                        if (lis.length > 0) {
                            this.highlight(lis.get(0));
                        }
                    }
                };
                AbstractChosen.prototype.selectUp = function () {
                    if (this.selected && this.selected.previousSibling) {
                        this.highlight(this.selected.previousSibling);
                    }
                };

                AbstractChosen.prototype.setStatus = function (status) {
                    switch (status) {
                        case 'begin':
                            $(this.search_field).addClass('throbbing');
                            //$(this.ariaLive).html('Searching for matches...');
                            break;
                        case 'cancel':
                        case 'error':
                        case 'found':
                            $(this.search_field).removeClass('throbbing');
                            break;
                    }
                };

                AbstractChosen.prototype.removePopup = function () {
                    // Hide popup.
                    var popup = this.popup;
                    if (popup) {
                        this.popup = null;
                        $(popup).fadeOut('fast', function () { $(popup).remove(); });
                    }
                    this.selected = false;
                    //$(this.ariaLive).empty();
                };

                AbstractChosen.prototype.hidePopup = function (keycode) {
                    // Select item if the right key or mousebutton was pressed.
                    if (this.selected && ((keycode && keycode != 46 && keycode != 8 && keycode != 27) || !keycode))
                    {
                        this.select(this.selected);
                    }
                    this.removePopup();
                };

                AbstractChosen.prototype.unhighlight = function (node) {
                    $(node).removeClass('selected');
                    this.selected = false;
                    //$(this.ariaLive).empty();
                };

                AbstractChosen.prototype.highlight = function (node) {
                    if (this.selected) {
                        $(this.selected).removeClass('selected');
                    }
                    $(node).addClass('selected');
                    this.selected = node;
                    //$(this.ariaLive).html($(this.selected).html());
                };

                AbstractChosen.prototype.populatePopup = function ()
                {
                    var $input = $( this.search_field );

                    //this.removePopup();
                    if (this.popup) {
                        $(this.popup).remove();
                        this.popup = null;
                    }
                    this.selected = false;

                    // Show popup.
                    this.popup = $('<div id="autocomplete"></div>')[0];
                    this.popup.owner = this;

                    var position = $input.position();
                    var top      = position.top + this.search_field[0].offsetHeight + 9;
                    var left     = position.left - 7;
                    var width    = $input.innerWidth();
                    $(this.popup).css({
                        top    : parseInt(top  , 10) + 'px',
                        left   : parseInt(left , 10) + 'px',
                        width  : parseInt(width, 10) + 'px',
                        display: 'none'
                    });

                    //$input.before(this.popup);
                    $(".chosen-choices").before(this.popup);

                    // Do search.
                    //this.owner = this;

                    // If no value in the textfield, do not show the popup.
                    //if (!this.input.value.length) {
                    //    return false;
                    //}
                };

                AbstractChosen.prototype.found = function (matches)
                {
                    this.populatePopup();

                    // Prepare matches.
                    var ul = $('<ul></ul>');
                    var ac = this;
                    for (key in matches) {
                        $('<li></li>')
                            .html($('<div></div>').html(matches[key]))
                            .mousedown(
                                function ()
                                {
                                    ac.hidePopup( this );
                                    if( ac.timer )
                                    {
                                        clearTimeout( ac.timer );
                                    }
                                    ac.timer = setTimeout(
                                        function ()
                                        {
                                            $( '.chosen-search-input' ).focus();
                                            ac.results_search();
                                        }, ac.delay
                                    );
                                }
                            )
                            .mouseover(function () { ac.highlight  (this); })
                            .mouseout (function () { ac.unhighlight(this); })
                            .data('autocompleteValue', key)
                            .appendTo(ul);
                    }

                    // Show popup with matches, if any.
                    if (this.popup) {
                        if (ul.children().length) {
                            $(this.popup).empty().append(ul).show();
                           // $(this.ariaLive).html(Drupal.t('Autocomplete popup'));
                        }
                        else {
                            $(this.popup).css({ visibility: 'hidden' });
                            this.hidePopup();
                        }
                    }

                    this.update_form_field();
                };

                AbstractChosen.prototype.get_selected_terms = function()
                {
                    var items = [];
                    if( this.search_field && this.results_data && this.results_data.length )
                    {
                        var active_container, a, i, j, v, len;
                        active_container = this.search_field.closest( '.chosen-container' );
                        if (active_container.length && this.container[0] === active_container[0])
                        {
                            a = active_container.find('a.token-link-wrapper');//( '.search-choice-close' );
                            for( i = 0, len = a.length; i < len; i ++ )
                            {
                                j = a[ i ].getAttribute( "data-option-array-index" );
                                if( j >= 0 && j < this.results_data.length )
                                {
                                    v = this.results_data[ j ];
                                    items.push( v );
                                }
                            }
                        }
                    }
                    return items;
                };

                AbstractChosen.update_drupal_ajax = function( this_jq )
                {
                  if( Drupal && Drupal.ajax )
                  {
                    var active_container = this_jq.search_field.closest( '.chosen-container' );
                    if (active_container.length && this_jq.container[0] === active_container[0])
                    {
                      this_jq.update_form_field();

                      // var tokens_json = JSON.stringify( this_jq.results_data );
                      // for (var i = 0, len = this_jq.results_data.length; i < len; i++) {
                      //   if( ('fulltextsearch_tags_id_chosen' + i) in Drupal.ajax ) {
                      //     Drupal.ajax['fulltextsearch_tags_id_chosen' + i].submit.idx = i;
                      //     Drupal.ajax['fulltextsearch_tags_id_chosen' + i].submit.tokens = tokens_json;
                      //   }
                      // }
                    }
                  }
                }

                AbstractChosen.prototype.update_form_field = function()
                {
                    var active_container, a, spans, i, len, v, t;
                    active_container = this.search_field.closest( '.chosen-container' );
                    if (active_container.length && this.container[0] === active_container[0])
                    {
                        a = active_container.find( '.search-choice-close' );
                        for( i = 0, len = a.length; i < len; i ++ )
                        {
                            a[ i ].setAttribute( "data-option-array-index", i );
                        }

                        this.form_field_jq.empty();
                        spans = active_container.find( 'li.search-choice>span' );
                        for( i = 0, len = spans.length; i < len; i ++ )
                        {
                            t = $(spans[ i ]).text(); // text from html
                            v = t; //$(spans[ i ]).html();
                            this.form_field_jq.append( $( '<option>', { value: v + '(num:' + ( i+1 ) + ')', text : t } ).attr( 'selected', true ) );
                        }

                        this.selected_option_count = null;
                        this.results_data = SelectParser.select_to_array( this.form_field );

                        var tokens_json = JSON.stringify( this.results_data );

                        a = active_container.find( 'ul li span a.token-link-wrapper' );
                        for( i = 0, len = a.length; i < len; i ++ )
                        {
                          a[ i ].setAttribute( "data-option-array-index", i );
                          this.edit_link_build( $( a[ i ] ), tokens_json, i );
                        }

                        a = active_container.find( 'ul li a.search-choice-close' );
                        for( i = 0, len = a.length; i < len; i ++ )
                        {
                          a[ i ].setAttribute( "data-option-array-index", i );
                          this.close_link_build( $( a[ i ] ), tokens_json, i );
                        }
                    }
                };

                AbstractChosen.prototype.search = function()
                {
                    if( !this.ajax_started )
                    {
                        this.ajax_started = true;

                        //this.removePopup();
                        if( this.popup )
                        {
                            $( this.popup ).remove();
                            this.popup = null;
                        }
                        this.selected      = false;

                        this.searchString  = this.get_search_text();

                        var db             = this;
                        var searchString   = this.searchString;
                        var selected_terms = JSON.stringify( this.get_selected_terms() );

                        if( this.timer )
                        {
                            clearTimeout( this.timer );
                        }
                        this.timer = setTimeout(
                            function ()
                            {
                                db.setStatus('begin');
                                $.ajax(
                                    {
                                        type       : 'POST',
                                        url        : Drupal.sanitizeAjaxUrl( db.uri + '/' + Drupal.encodePath( searchString ) ),
                                        data       : selected_terms,
                                        contentType: "application/json; charset=utf-8",
                                        dataType   : 'json',
                                        jsonp      : false,
                                      //timeout    : 500,
                                      //async      : false,
                                        success    : function ( matches )
                                        {
                                            if( typeof matches.status == 'undefined' || matches.status !== 0 )
                                            {
                                                if( db.searchString === searchString )
                                                {
                                                    db.found( matches );
                                                }
                                                db.setStatus( 'found' );
                                            }
                                            db.ajax_started = false;
                                        },
                                        error      : function ( xmlhttp )
                                        {
                                            Drupal.displayAjaxError( Drupal.ajaxError( xmlhttp, db.uri ) );
                                            db.ajax_started = false;
                                        }
                                        // complete : function () { db.ajax_started = false; }
                                    }
                                );
                            }, this.delay
                        );
                    }
                };


                AbstractChosen.prototype.winnow_results = function(options) {
                    // --------------------------------
                    this.search();

                    if( false )
                    {
                        var escapedQuery, fix, i, len, option, prefix, query, ref, regex, results, results_group, search_match, startpos, suffix, text;
                        this.no_results_clear();
                        results = 0;
                        query = this.get_search_text();
                        escapedQuery = query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
                        regex = this.get_search_regex(escapedQuery);

                        ref = this.results_data;
                        for (i = 0, len = ref.length; i < len; i++) {
                            option = ref[i];
                            option.search_match = false;
                            results_group = null;
                            search_match = null;
                            option.highlighted_html = '';
                            if (this.include_option_in_results(option)) {
                                if (option.group) {
                                    option.group_match = false;
                                    option.active_options = 0;
                                }
                                if ((option.group_array_index != null) && this.results_data[option.group_array_index]) {
                                    results_group = this.results_data[option.group_array_index];
                                    if (results_group.active_options === 0 && results_group.search_match) {
                                        results += 1;
                                    }
                                    results_group.active_options += 1;
                                }
                                text = option.group ? option.label : option.text;
                                if (!(option.group && !this.group_search)) {
                                    search_match = this.search_string_match(text, regex);
                                    option.search_match = search_match != null;
                                    if (option.search_match && !option.group) {
                                        results += 1;
                                    }
                                    if (option.search_match) {
                                        if (query.length) {
                                            startpos = search_match.index;
                                            prefix = text.slice(0, startpos);
                                            fix = text.slice(startpos, startpos + query.length);
                                            suffix = text.slice(startpos + query.length);
                                            option.highlighted_html = (this.escape_html(prefix)) + "<em>" + (this.escape_html(fix)) + "</em>" + (this.escape_html(suffix));
                                        }
                                        if (results_group != null) {
                                            results_group.group_match = true;
                                        }
                                    } else if ((option.group_array_index != null) && this.results_data[option.group_array_index].search_match) {
                                        option.search_match = true;
                                    }
                                }
                            }
                        }
                        this.result_clear_highlight();
                        if (results < 1 && query.length) {
                            this.update_results_content("");
                            return this.no_results(query);
                        } else {
                            this.update_results_content(this.results_option_build());
                            if (!(options != null ? options.skip_highlight : void 0)) {
                                return this.winnow_results_set_highlight();
                            }
                        }
                    }

                };

                AbstractChosen.prototype.get_search_regex = function(escaped_search_string) {
                    var regex_flag, regex_string;
                    regex_string = this.search_contains ? escaped_search_string : "(^|\\s|\\b)" + escaped_search_string + "[^\\s]*";
                    if (!(this.enable_split_word_search || this.search_contains)) {
                        regex_string = "^" + regex_string;
                    }
                    regex_flag = this.case_sensitive_search ? "" : "i";
                    return new RegExp(regex_string, regex_flag);
                };

                AbstractChosen.prototype.search_string_match = function(search_string, regex) {
                    var match;
                    match = regex.exec(search_string);
                    if (!this.search_contains && (match != null ? match[1] : void 0)) {
                        match.index += 1;
                    }
                    return match;
                };

                AbstractChosen.prototype.choices_count = function() {
                    var i, len, option, ref;
                    if (this.selected_option_count != null) {
                        return this.selected_option_count;
                    }
                    this.selected_option_count = 0;
                    ref = this.form_field.options;
                    for (i = 0, len = ref.length; i < len; i++) {
                        option = ref[i];
                        if (option.selected) {
                            this.selected_option_count += 1;
                        }
                    }
                    return this.selected_option_count;
                };

                AbstractChosen.prototype.choices_click = function(evt) {
                    evt.preventDefault();
                    this.activate_field();
                    if (!(this.results_showing || this.is_disabled)) {
                        return this.results_show();
                    }
                };

                AbstractChosen.prototype.keydown_checker = function(evt) {
                    var ref, stroke;
                    stroke = (ref = evt.which) != null ? ref : evt.keyCode;
                    this.search_field_scale();
                    if (stroke !== 8 && this.pending_backstroke) {
                        this.clear_backstroke();
                    }
                    switch (stroke) {
                        case 8: // Del.
                            this.backstroke_length = this.get_search_field_value().length;
                            break;
                        case 9:// Tab.
                            if (this.results_showing && !this.is_multiple) {
                                this.result_select(evt);
                            }
                            this.mouse_on_container = false;
                            break;
                        case 13:// Enter.
                            if (this.results_showing) {
                                evt.preventDefault();
                            }
                            break;
                        case 27:// Esc.
                            if (this.results_showing) {
                                evt.preventDefault();
                            }
                            break;
                        case 32:
                            if (this.disable_search) {
                                evt.preventDefault();
                            }
                            break;
                        case 38:// Up arrow.
                            evt.preventDefault();
                            //this.keyup_arrow();
                            this.selectUp();
                            break;
                        case 40:// Down arrow.
                            evt.preventDefault();
                            //this.keydown_arrow();
                            this.selectDown();
                            break;
                    }
                };

                AbstractChosen.prototype.keyup_checker = function(evt) {
                    var ref, stroke;
                    stroke = (ref = evt.which) != null ? ref : evt.keyCode;
                    this.search_field_scale();
                    switch (stroke) {
                        case 8: // Del.
                            if (this.results_showing) {
                                this.results_hide();
                            }
                            if (this.is_multiple && this.backstroke_length < 1 && this.choices_count() > 0) {
                                this.keydown_backstroke();
                            }
                            else
                            if (!this.pending_backstroke) {
                                this.result_clear_highlight();
                                this.results_search();
                            }
                            break;
                        case 13: // Enter.
                            evt.preventDefault();
                            if (this.results_showing) {
                                this.result_select(evt);
                                this.results_search();
                            }
                            break;
                        case 27: // Esc.
                            if (this.results_showing) {
                                this.results_hide();
                            }
                            break;
                        case  9:// Tab.
                        case 16:// Shift.
                        case 17:// Ctrl.
                        case 18:// Alt.
                        case 38:// Up arrow.
                        case 40:// Down arrow.
                        case 91:
                            break;
                        default:
                            this.results_search();
                            break;
                    }
                };

                AbstractChosen.prototype.clipboard_event_checker = function(evt) {
                    if (this.is_disabled) {
                        return;
                    }
                    return setTimeout(((function(_this) {
                        return function() {
                            return _this.results_search();
                        };
                    })(this)), 50);
                };

                AbstractChosen.prototype.container_width = function() {
                    if (this.options.width != null) {
                        return this.options.width;
                    } else {
                        return '100%';// this.form_field.offsetWidth + "px"; //
                    }
                };

                AbstractChosen.prototype.include_option_in_results = function(option) {
                    if (this.is_multiple && (!this.display_selected_options && option.selected)) {
                        return false;
                    }
                    if (!this.display_disabled_options && option.disabled) {
                        return false;
                    }
                    if (option.empty) {
                        return false;
                    }
                    return true;
                };

                AbstractChosen.prototype.search_results_touchstart = function(evt) {
                    this.touch_started = true;
                    return this.search_results_mouseover(evt);
                };

                AbstractChosen.prototype.search_results_touchmove = function(evt) {
                    this.touch_started = false;
                    return this.search_results_mouseout(evt);
                };

                AbstractChosen.prototype.search_results_touchend = function(evt) {
                    if (this.touch_started) {
                        return this.search_results_mouseup(evt);
                    }
                };

                AbstractChosen.prototype.outerHTML = function(element) {
                    var tmp;
                    if (element.outerHTML) {
                        return element.outerHTML;
                    }
                    tmp = document.createElement("div");
                    tmp.appendChild(element);
                    return tmp.innerHTML;
                };

                AbstractChosen.prototype.get_single_html = function() {
                    return "<a class=\"chosen-single chosen-default\">\n  <span>" + this.default_text + "</span>\n  <div><b></b></div>\n</a>\n<div class=\"chosen-drop\">\n  <div class=\"chosen-search\">\n    <input class=\"chosen-search-input\" type=\"text\" autocomplete=\"off\" />\n  </div>\n  <ul class=\"chosen-results\"></ul>\n</div>";
                };

                AbstractChosen.prototype.get_multi_html = function() {
                    return "<ul class=\"chosen-choices form-autocomplete-stop\">\n  <li class=\"search-field\">\n    <input class=\"chosen-search-input\" type=\"text\" autocomplete=\"off\" value=\"" + this.default_text + "\" placeholder=\"add token\" />\n  </li>\n</ul>\n<div class=\"chosen-drop\">\n  <ul class=\"chosen-results\"></ul>\n</div>";
                };

                AbstractChosen.prototype.get_no_results_html = function(terms) {
                    return "<li class=\"no-results\">\n  " + this.results_none_found + " <span>" + (this.escape_html(terms)) + "</span>\n</li>";
                };

                AbstractChosen.browser_is_supported = function() {
                    if ("Microsoft Internet Explorer" === window.navigator.appName) {
                        return document.documentMode >= 8;
                    }
                    //if (/iP(od|hone)/i.test(window.navigator.userAgent) || /IEMobile/i.test(window.navigator.userAgent) || /Windows Phone/i.test(window.navigator.userAgent) || /BlackBerry/i.test(window.navigator.userAgent) || /BB10/i.test(window.navigator.userAgent) || /Android.*Mobile/i.test(window.navigator.userAgent)) {
                    //    return false;
                    //}
                    return true;
                };

                AbstractChosen.default_multiple_text = "tokens ..."; //"Select Some Options";

                AbstractChosen.default_single_text = "tokens ..."; //"Select an Option";

                AbstractChosen.default_no_result_text = "No results match";

                return AbstractChosen;
            }
        )();

        $.fn.extend({
            chosen: function(options) {
                if (!AbstractChosen.browser_is_supported()) {
                    return this;
                }

                return this.each(function(input_field) {
                    var $this, chosen;
                    $this = $(this);
                    chosen = $this.data('chosen');
                    if (options === 'destroy') {
                        if (chosen instanceof Chosen) {
                            chosen.destroy();
                        }
                        return;
                    }
                    if (!(chosen instanceof Chosen)) {
                        $this.data('chosen', new Chosen(this, options));
                    }
                    else
                    {
                      AbstractChosen.update_drupal_ajax( chosen );
                    }
                });
            }
        });

        Chosen =
        (
            function( superClass )
            {
                extend( Chosen, superClass );

                function Chosen() {
                    return Chosen.__super__.constructor.apply(this, arguments);
                }

                Chosen.prototype.setup = function() {
                    this.form_field_jq = $(this.form_field);
                    return this.current_selectedIndex = this.form_field.selectedIndex;
                };

                Chosen.prototype.set_up_html = function() {
                    var container_classes, container_props;
                    container_classes = ["chosen-container"];
                    container_classes.push("chosen-container-" + (this.is_multiple ? "multi" : "single"));
                    if (this.inherit_select_classes && this.form_field.className) {
                        container_classes.push(this.form_field.className);
                    }
                    if (this.is_rtl) {
                        container_classes.push("chosen-rtl");
                    }
                    container_props = {
                        'class': container_classes.join(' '),
                        'title': this.form_field.title
                    };
                    if (this.form_field.id.length) {
                        container_props.id = this.form_field.id.replace(/[^\w]/g, '_') + "_chosen";
                    }
                    this.container = $("<div />", container_props);
                    this.container.width(this.container_width());
                    if (this.is_multiple) {
                        this.container.html(this.get_multi_html());
                    } else {
                        this.container.html(this.get_single_html());
                    }
                    this.form_field_jq.hide().after(this.container);
                    this.dropdown = this.container.find('div.chosen-drop').first();
                    this.search_field = this.container.find('input').first();
                    this.search_results = this.container.find('ul.chosen-results').first();
                    this.search_field_scale();
                    this.search_no_results = this.container.find('li.no-results').first();
                    if (this.is_multiple) {
                        this.search_choices = this.container.find('ul.chosen-choices').first();
                        this.search_container = this.container.find('li.search-field').first();
                    } else {
                        this.search_container = this.container.find('div.chosen-search').first();
                        this.selected_item = this.container.find('.chosen-single').first();
                    }
                    this.results_build();
                    this.set_tab_index();
                    return this.set_label_behavior();
                };

                Chosen.prototype.on_ready = function() {
                    return this.form_field_jq.trigger("chosen:ready", {
                        chosen: this
                    });
                };

                Chosen.prototype.register_observers = function() {
                    this.container.on('touchstart.chosen', (function(_this) {
                        return function(evt) {
                            _this.container_mousedown(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.container.on('touchend.chosen', (function(_this) {
                        return function(evt) {
                            _this.container_mouseup(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.container.on('mousedown.chosen', (function(_this) {
                        return function(evt) {
                            _this.container_mousedown(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.container.on('mouseup.chosen', (function(_this) {
                        return function(evt) {
                            _this.container_mouseup(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.container.on('mouseenter.chosen', (function(_this) {
                        return function(evt) {
                            _this.mouse_enter(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.container.on('mouseleave.chosen', (function(_this) {
                        return function(evt) {
                            _this.mouse_leave(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.search_results.on('mouseup.chosen', (function(_this) {
                        return function(evt) {
                            _this.search_results_mouseup(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.search_results.on('mouseover.chosen', (function(_this) {
                        return function(evt) {
                            _this.search_results_mouseover(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.search_results.on('mouseout.chosen', (function(_this) {
                        return function(evt) {
                            _this.search_results_mouseout(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.search_results.on('mousewheel.chosen DOMMouseScroll.chosen', (function(_this) {
                        return function(evt) {
                            _this.search_results_mousewheel(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.search_results.on('touchstart.chosen', (function(_this) {
                        return function(evt) {
                            _this.search_results_touchstart(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.search_results.on('touchmove.chosen', (function(_this) {
                        return function(evt) {
                            _this.search_results_touchmove(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.search_results.on('touchend.chosen', (function(_this) {
                        return function(evt) {
                            _this.search_results_touchend(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.form_field_jq.on("chosen:updated.chosen", (function(_this) {
                        return function(evt) {
                            _this.results_update_field(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.form_field_jq.on("chosen:activate.chosen", (function(_this) {
                        return function(evt) {
                            _this.activate_field(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.form_field_jq.on("chosen:open.chosen", (function(_this) {
                        return function(evt) {
                            _this.container_mousedown(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.form_field_jq.on("chosen:close.chosen", (function(_this) {
                        return function(evt) {
                            _this.close_field(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.search_field.on('blur.chosen', (function(_this) {
                        return function(evt) {
                            _this.input_blur(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.search_field.on('keyup.chosen', (function(_this) {
                        return function(evt) {
                            _this.keyup_checker(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.search_field.on('keydown.chosen', (function(_this) {
                        return function(evt) {
                            _this.keydown_checker(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.search_field.on('focus.chosen', (function(_this) {
                        return function(evt) {
                            _this.input_focus(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.search_field.on('cut.chosen', (function(_this) {
                        return function(evt) {
                            _this.clipboard_event_checker(evt);
                            log( evt.type );
                        };
                    })(this));
                    this.search_field.on('paste.chosen', (function(_this) {
                        return function(evt) {
                            _this.clipboard_event_checker(evt);
                            log( evt.type );
                        };
                    })(this));
                    if (this.is_multiple) {
                        return this.search_choices.on('click.chosen', (function(_this) {
                            return function(evt) {
                                _this.choices_click(evt);
                                log( evt.type );
                            };
                        })(this));
                    } else {
                        return this.container.on('click.chosen', function(evt) {
                            evt.preventDefault();
                            log( evt.type );
                        });
                    }
                };

                Chosen.prototype.destroy = function() {
                    $(this.container[0].ownerDocument).off('click.chosen', this.click_test_action);
                    if (this.form_field_label.length > 0) {
                        this.form_field_label.off('click.chosen');
                    }
                    if (this.search_field[0].tabIndex) {
                        this.form_field_jq[0].tabIndex = this.search_field[0].tabIndex;
                    }
                    this.container.remove();
                    this.form_field_jq.removeData('chosen');
                    return this.form_field_jq.show();
                };

                Chosen.prototype.search_field_disabled = function() {
                    this.is_disabled = this.form_field.disabled || this.form_field_jq.parents('fieldset').is(':disabled');
                    this.container.toggleClass('chosen-disabled', this.is_disabled);
                    this.search_field[0].disabled = this.is_disabled;
                    if (!this.is_multiple) {
                        this.selected_item.off('focus.chosen', this.activate_field);
                    }
                    if (this.is_disabled) {
                        return this.close_field();
                    } else if (!this.is_multiple) {
                        return this.selected_item.on('focus.chosen', this.activate_field);
                    }
                };

                Chosen.prototype.container_mousedown = function(evt) {
                    var ref;
                    if (this.is_disabled) {
                        return;
                    }
                    if (evt && ((ref = evt.type) === 'mousedown' || ref === 'touchstart') && !this.results_showing) {
                        evt.preventDefault();
                    }
                    if (!((evt != null) && ($(evt.target)).hasClass("search-choice-close"))) {
                        if (!this.active_field) {
                            if (this.is_multiple) {
                                this.search_field.val("");
                            }
                            $(this.container[0].ownerDocument).on('click.chosen', this.click_test_action);
                            this.results_show();
                        } else if (!this.is_multiple && evt && (($(evt.target)[0] === this.selected_item[0]) || $(evt.target).parents("a.chosen-single").length)) {
                            evt.preventDefault();
                            this.results_toggle();
                        }
                        return this.activate_field();
                    }
                };

                Chosen.prototype.container_mouseup = function(evt) {
                    if (evt.target.nodeName === "ABBR" && !this.is_disabled) {
                        return this.results_reset(evt);
                    }
                };

                Chosen.prototype.search_results_mousewheel = function(evt) {
                    var delta;
                    if (evt.originalEvent) {
                        delta = evt.originalEvent.deltaY || -evt.originalEvent.wheelDelta || evt.originalEvent.detail;
                    }
                    if (delta != null) {
                        evt.preventDefault();
                        if (evt.type === 'DOMMouseScroll') {
                            delta = delta * 40;
                        }
                        return this.search_results.scrollTop(delta + this.search_results.scrollTop());
                    }
                };

                Chosen.prototype.blur_test = function(evt) {
                    if (!this.active_field && this.container.hasClass("chosen-container-active")) {
                        return this.close_field();
                    }
                };

                Chosen.prototype.close_field = function() {
                    $(this.container[0].ownerDocument).off("click.chosen", this.click_test_action);
                    this.active_field = false;
                    this.results_hide();
                    this.container.removeClass("chosen-container-active");
                    this.clear_backstroke();
                    this.show_search_field_default();
                    this.search_field_scale();
                    return this.search_field.blur();
                };

                Chosen.prototype.activate_field = function() {
                    if (this.is_disabled) {
                        return;
                    }
                    this.container.addClass("chosen-container-active");
                    this.active_field = true;
                    this.search_field.val(this.search_field.val());
                    return this.search_field.focus();
                };

                Chosen.prototype.test_active_click = function(evt) {
                    var active_container;
                    active_container = $(evt.target).closest('.chosen-container');
                    if (active_container.length && this.container[0] === active_container[0]) {
                        return this.active_field = true;
                    } else {
                        return this.close_field();
                    }
                };

                Chosen.prototype.results_build = function() {
                    this.parsing = true;
                    this.selected_option_count = null;
                    this.results_data = SelectParser.select_to_array(this.form_field);
                    if (this.is_multiple) {
                        this.search_choices.find("li.search-choice").remove();
                    } else {
                        this.single_set_selected_text();
                        if (this.disable_search || this.form_field.options.length <= this.disable_search_threshold) {
                            this.search_field[0].readOnly = true;
                            this.container.addClass("chosen-container-single-nosearch");
                        } else {
                            this.search_field[0].readOnly = false;
                            this.container.removeClass("chosen-container-single-nosearch");
                        }
                    }
                    this.update_results_content(this.results_option_build({
                        first: true
                    }));
                    this.search_field_disabled();
                    this.show_search_field_default();
                    this.search_field_scale();
                    return this.parsing = false;
                };

                Chosen.prototype.result_do_highlight = function(el) {
                    var high_bottom, high_top, maxHeight, visible_bottom, visible_top;
                    if (el.length) {
                        this.result_clear_highlight();
                        this.result_highlight = el;
                        this.result_highlight.addClass("highlighted");
                        maxHeight = parseInt(this.search_results.css("maxHeight"), 10);
                        visible_top = this.search_results.scrollTop();
                        visible_bottom = maxHeight + visible_top;
                        high_top = this.result_highlight.position().top + this.search_results.scrollTop();
                        high_bottom = high_top + this.result_highlight.outerHeight();
                        if (high_bottom >= visible_bottom) {
                            return this.search_results.scrollTop((high_bottom - maxHeight) > 0 ? high_bottom - maxHeight : 0);
                        } else if (high_top < visible_top) {
                            return this.search_results.scrollTop(high_top);
                        }
                    }
                };

                Chosen.prototype.result_clear_highlight = function() {
                    if (this.result_highlight) {
                        this.result_highlight.removeClass("highlighted");
                    }
                    return this.result_highlight = null;
                };

                Chosen.prototype.results_show = function() {
                    if (this.is_multiple && this.max_selected_options <= this.choices_count()) {
                        this.form_field_jq.trigger("chosen:maxselected", {
                            chosen: this
                        });
                        return false;
                    }
                    this.container.addClass("chosen-with-drop");
                    this.results_showing = true;
                    this.search_field.focus();
                    this.search_field.val(this.get_search_field_value());
                    this.winnow_results();
                    return this.form_field_jq.trigger("chosen:showing_dropdown", {
                        chosen: this
                    });
                };

                Chosen.prototype.update_results_content = function(content) {
                    return this.search_results.html(content);
                };

                Chosen.prototype.results_hide = function() {
                    if (this.results_showing) {
                        this.result_clear_highlight();
                        this.container.removeClass("chosen-with-drop");
                        this.form_field_jq.trigger("chosen:hiding_dropdown", {
                            chosen: this
                        });
                    }

                    // --------------------
                    //Object.getPrototypeOf( Chosen.prototype ).hidePopup.call( this );
                    Object.getPrototypeOf(this.constructor.prototype).hidePopup.call( this );

                    return this.results_showing = false;
                };

                Chosen.prototype.set_tab_index = function(el) {
                    var ti;
                    if (this.form_field.tabIndex) {
                        ti = this.form_field.tabIndex;
                        this.form_field.tabIndex = -1;
                        return this.search_field[0].tabIndex = ti;
                    }
                };

                Chosen.prototype.set_label_behavior = function() {
                    this.form_field_label = this.form_field_jq.parents("label");
                    if (!this.form_field_label.length && this.form_field.id.length) {
                        this.form_field_label = $("label[for='" + this.form_field.id + "']");
                    }
                    if (this.form_field_label.length > 0) {
                        return this.form_field_label.on('click.chosen', this.label_click_handler);
                    }
                };

                Chosen.prototype.show_search_field_default = function() {
                    if (this.is_multiple && this.choices_count() < 1 && !this.active_field) {
                        this.search_field.val(this.default_text);
                        return this.search_field.addClass("default");
                    } else {
                        this.search_field.val("");
                        return this.search_field.removeClass("default");
                    }
                };

                Chosen.prototype.search_results_mouseup = function(evt) {
                    var target;
                    target = $(evt.target).hasClass("active-result") ? $(evt.target) : $(evt.target).parents(".active-result").first();
                    if (target.length) {
                        this.result_highlight = target;
                        this.result_select(evt);
                        return this.search_field.focus();
                    }
                };

                Chosen.prototype.search_results_mouseover = function(evt) {
                    var target;
                    target = $(evt.target).hasClass("active-result") ? $(evt.target) : $(evt.target).parents(".active-result").first();
                    if (target) {
                        return this.result_do_highlight(target);
                    }
                };

                Chosen.prototype.search_results_mouseout = function(evt) {
                    if ($(evt.target).hasClass("active-result") || $(evt.target).parents('.active-result').first()) {
                        return this.result_clear_highlight();
                    }
                };

                // Chosen.prototype.edit_links_build = function()
                // {
                //   var i, len, proto, tokens, tokens_json;
                //   proto       = Object.getPrototypeOf( this.constructor.prototype );
                //   tokens      = proto.get_selected_terms.call( this );
                //   tokens_json = JSON.stringify( tokens );
                //   for (i = 0, len = tokens.length; i < len; i++) {
                //     var selector = '#fulltextsearch_tags_id_chosen ul li span a.token-link-wrapper[data-option-array-index=' + i + ']';
                //     this.edit_link_build( $(selector), tokens_json, i );
                //   }
                // }

                Chosen.prototype.link_builder = function( choice_link_jq, tokens_json, i, operation )
                {
                  if( Drupal && Drupal.ajax )
                  {
                    choice_link_jq.off('click').each(
                      function()
                      {
                        var _cell = 'fulltextsearch_tags_id_chosen_' + operation + '_' + i;
                        var _url  = window.location.protocol + '//' + window.location.hostname + '/ajax/' + operation + '/token/fulltextsearch';

                        var element_settings = {
                          url      : _url,
                          event    : 'click',
                          progress :
                          {
                            type     : 'none' //'throbber'
                          },
                          submit   : // for POST
                          {
                            'js'     : true,
                            'tokens' : tokens_json,
                            'idx'    : i
                          }
                        };
                        if( _cell in Drupal.ajax ) {
                          Drupal.ajax[ _cell ] = null;
                        }
                        Drupal.ajax[ _cell ] = new Drupal.ajax( _cell, this, element_settings );
                      }
                    );
                  }
                }

                Chosen.prototype.edit_link_build = function( choice_link_jq, tokens_json, i )
                {
                  this.link_builder( choice_link_jq, tokens_json, i, 'edit' );
                }

                Chosen.prototype.close_link_build = function( choice_link_jq, tokens_json, i )
                {
                  this.link_builder( choice_link_jq, tokens_json, i, 'delete' );
                }

                Chosen.prototype.choice_build = function( item ) {
                    var choice_link, choice, close_link, classes;

                    var with_close_link = $('#fulltextsearch_tags_id').data('with_close_link');

                    classes = item.classes ? (' '+item.classes) : '';

                    choice_link = $('<a />', {
                      "class": ("ctools-modal-fulltextsearch-popup-style token-link-wrapper" + classes),
                      'data-option-array-index': item.array_index
                    }).html( this.choice_label( item ) );

                    choice = $('<li />', {
                        "class": (with_close_link?"search-choice search-choice-with-close":"search-choice")
                      }
                    );
                    choice.append( $('<span />').append( choice_link ) );

                    if (item.disabled) {
                        choice.addClass('search-choice-disabled');
                    }
                    else {
                      if( with_close_link )
                      {
                        close_link = $('<a />', {
                          "class": 'search-choice-close',
                          'data-option-array-index': item.array_index
                        });
                        // close_link.on('click.chosen', (
                        //   function(_this) {
                        //     return function(evt) {
                        //       return _this.choice_destroy_link_click(evt);
                        //     };
                        //   })(this));
                        var svg = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">\n' +
                          '  <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />\n' +
                          '</svg>';
                        close_link.html( svg );
                        choice.append(close_link);
                      }
                    }

                    const rc = this.search_container.before( choice );

                    var proto       = Object.getPrototypeOf( this.constructor.prototype );
                    var tokens      = proto.get_selected_terms.call( this );
                    var tokens_json = JSON.stringify( tokens );
                    this.edit_link_build( choice_link, tokens_json, item.array_index );
                    if( with_close_link )
                    {
                      this.close_link_build( close_link, tokens_json, item.array_index );
                    }

                    return rc;
                };

                Chosen.prototype.choice_destroy_link_click = function(evt) {
                    evt.preventDefault();
                    evt.stopPropagation();
                    if (!this.is_disabled) {
                        return this.choice_destroy($(evt.target));
                    }
                };

                Chosen.prototype.choice_destroy = function(link) {
                    if (this.result_deselect(link[0].getAttribute("data-option-array-index"))) {
                        if (this.active_field) {
                            this.search_field.focus();
                        } else {
                            this.show_search_field_default();
                        }
                        if (this.is_multiple && this.choices_count() > 0 && this.get_search_field_value().length < 1) {
                            this.results_hide();
                        }
                        link.parents('li').first().remove();
                        this.update_form_field();
                        return this.search_field_scale();
                    }
                };

                Chosen.prototype.results_reset = function() {
                    this.reset_single_select_options();
                    this.form_field.options[0].selected = true;
                    this.single_set_selected_text();
                    this.show_search_field_default();
                    this.results_reset_cleanup();
                    this.trigger_form_field_change();
                    if (this.active_field) {
                        return this.results_hide();
                    }
                };

                Chosen.prototype.results_reset_cleanup = function() {
                    this.current_selectedIndex = this.form_field.selectedIndex;
                    return this.selected_item.find("abbr").remove();
                };

                Chosen.prototype.add_option = function( form_field, val )
                {
                    if( form_field != null )
                    {
                        if( val != null && val.length > 0 )
                        {
                            var option = document.createElement( "option" );
                            option.value     = val;
                            option.innerHTML = val;
                            option.setAttribute( "data-option-array-index", form_field.length );

                            form_field.appendChild( option );

                            this.result_highlight = $( option );
                            this.results_data     = SelectParser.select_to_array( form_field );
                        }
                    }
                };

                Chosen.prototype.add_option_default = function()
                {
                    if( this.search_field != null )
                    {
                        //var val = $(node).data('autocompleteValue');
                        //this.search_field.val( val );

                        this.add_option( this.form_field, this.search_field.val() );
                    }
                };

                Chosen.prototype.result_select = function(evt) {

                    // +++++++++++
                    if( !this.result_highlight )
                    {
                        var ref, stroke;
                        stroke = (ref = evt.which) != null ? ref : evt.keyCode;
                        if( stroke === 13 && this.popup )
                        {
                            this.results_hide();
                        }
                        else
                        {
                            this.add_option_default();
                        }
                    }

                    var high, item;
                    if (this.result_highlight) {
                        high = this.result_highlight;
                        this.result_clear_highlight();
                        if (this.is_multiple && this.max_selected_options <= this.choices_count()) {
                            this.form_field_jq.trigger("chosen:maxselected", {
                                chosen: this
                            });
                            return false;
                        }
                        if (this.is_multiple) {
                            high.removeClass("active-result");
                        } else {
                            this.reset_single_select_options();
                        }
                        high.addClass("result-selected");
                        item = this.results_data[high[0].getAttribute("data-option-array-index")];
                        item.selected = true;
                        this.form_field.options[item.options_index].selected = true;
                        this.selected_option_count = null;

                        if (this.is_multiple) {
                            this.choice_build(item);
                        } else {
                            this.single_set_selected_text(this.choice_label(item));
                        }

                        //this.edit_links_build();
                        AbstractChosen.update_drupal_ajax( this );

                        if (this.is_multiple && (!this.hide_results_on_select || (evt != null && (evt.metaKey || evt.ctrlKey))))
                        {
                          if (evt != null && (evt.metaKey || evt.ctrlKey))
                          {
                              this.winnow_results({
                                  skip_highlight: true
                              });
                          } else {
                              this.search_field.val("");
                              this.winnow_results();
                          }
                        } else {
                            this.results_hide();
                            this.show_search_field_default();
                        }
                        if (this.is_multiple || this.form_field.selectedIndex !== this.current_selectedIndex) {
                            this.trigger_form_field_change({
                                selected: this.form_field.options[item.options_index].value
                            });
                        }
                        this.current_selectedIndex = this.form_field.selectedIndex;
                        if( evt != null )
                        {
                            evt.preventDefault();
                        }
                        return this.search_field_scale();
                    }
                };

                Chosen.prototype.single_set_selected_text = function(text) {
                    if (text == null) {
                        text = this.default_text;
                    }
                    if (text === this.default_text) {
                        this.selected_item.addClass("chosen-default");
                    } else {
                        this.single_deselect_control_build();
                        this.selected_item.removeClass("chosen-default");
                    }
                    return this.selected_item.find("span").html(text);
                };

                Chosen.prototype.result_deselect = function(pos) {
                    var result_data;
                    result_data = this.results_data[pos];
                    if (typeof result_data !== 'undefined' && !this.form_field.options[result_data.options_index].disabled) {
                        result_data.selected = false;
                        this.form_field.options[result_data.options_index].selected = false;
                        this.selected_option_count = null;
                        this.result_clear_highlight();
                        if (this.results_showing) {
                            this.winnow_results();
                        }
                        this.trigger_form_field_change({
                            deselected: this.form_field.options[result_data.options_index].value
                        });
                        this.search_field_scale();
                        return true;
                    } else {
                        return false;
                    }
                };

                Chosen.prototype.single_deselect_control_build = function() {
                    if (!this.allow_single_deselect) {
                        return;
                    }
                    if (!this.selected_item.find("abbr").length) {
                        this.selected_item.find("span").first().after("<abbr class=\"search-choice-close\"></abbr>");
                    }
                    return this.selected_item.addClass("chosen-single-with-deselect");
                };

                Chosen.prototype.get_search_field_value = function() {
                    return this.search_field.val();
                };

                Chosen.prototype.get_search_text = function() {
                    return $.trim(this.get_search_field_value());
                };

                Chosen.prototype.escape_html = function(text) {
                    return $('<div/>').text(text).html();
                };

                Chosen.prototype.winnow_results_set_highlight = function() {
                    var do_high, selected_results;
                    selected_results = !this.is_multiple ? this.search_results.find(".result-selected.active-result") : [];
                    do_high = selected_results.length ? selected_results.first() : this.search_results.find(".active-result").first();
                    if (do_high != null) {
                        return this.result_do_highlight(do_high);
                    }
                };

                Chosen.prototype.no_results = function(terms) {
                    var no_results_html;
                    no_results_html = this.get_no_results_html(terms);
                    this.search_results.append(no_results_html);
                    return this.form_field_jq.trigger("chosen:no_results", {
                        chosen: this
                    });
                };

                Chosen.prototype.no_results_clear = function() {
                    return this.search_results.find(".no-results").remove();
                };

                Chosen.prototype.keydown_arrow = function() {
                    var next_sib;
                    if (this.results_showing && this.result_highlight) {
                        next_sib = this.result_highlight.nextAll("li.active-result").first();
                        if (next_sib) {
                            return this.result_do_highlight(next_sib);
                        }
                    } else {
                        return this.results_show();
                    }
                };

                Chosen.prototype.keyup_arrow = function() {
                    var prev_sibs;
                    if (!this.results_showing && !this.is_multiple) {
                        return this.results_show();
                    } else if (this.result_highlight) {
                        prev_sibs = this.result_highlight.prevAll("li.active-result");
                        if (prev_sibs.length) {
                            return this.result_do_highlight(prev_sibs.first());
                        } else {
                            if (this.choices_count() > 0) {
                                this.results_hide();
                            }
                            return this.result_clear_highlight();
                        }
                    }
                };

                Chosen.prototype.keydown_backstroke = function() {
                    var next_available_destroy;
                    if (this.pending_backstroke) {
                        this.choice_destroy(this.pending_backstroke.find("a").first());
                        return this.clear_backstroke();
                    } else {
                        next_available_destroy = this.search_container.siblings("li.search-choice").last();
                        if (next_available_destroy.length && !next_available_destroy.hasClass("search-choice-disabled")) {
                            this.pending_backstroke = next_available_destroy;
                            if (this.single_backstroke_delete) {
                                return this.keydown_backstroke();
                            } else {
                                return this.pending_backstroke.addClass("search-choice-focus");
                            }
                        }
                    }
                };

                Chosen.prototype.clear_backstroke = function() {
                    if (this.pending_backstroke) {
                        this.pending_backstroke.removeClass("search-choice-focus");
                    }
                    return this.pending_backstroke = null;
                };

                Chosen.prototype.search_field_scale = function() {
                    var div, i, len, style, style_block, styles, width;
                    if (!this.is_multiple) {
                        return;
                    }
                    style_block = {
                        position  : 'absolute',
                        left      : '-1000px',
                        top       : '-1000px',
                        display   : 'none',
                        whiteSpace: 'pre'
                    };
                    styles = ['fontSize', 'fontStyle', 'fontWeight', 'fontFamily', 'lineHeight', 'textTransform', 'letterSpacing'];
                    for (i = 0, len = styles.length; i < len; i++) {
                        style = styles[i];
                        style_block[style] = this.search_field.css(style);
                    }
                    div = $('<div />').css(style_block);
                    div.text(this.get_search_field_value());
                    $('body').append(div);
                    width = div.width() + 150;
                    div.remove();
                    if (this.container.is(':visible')) {
                        width = Math.min(this.container.outerWidth() - 10, width);
                    }
                    return this.search_field.width(width);
                };

                Chosen.prototype.trigger_form_field_change = function(extra) {
                    this.form_field_jq.trigger("input", extra);
                    return this.form_field_jq.trigger("change", extra);
                };

                return Chosen;
            }
        )( AbstractChosen );
    }
)(jQuery);

function log( msg )
{
  const use = false;
  if( use )
  {
    console.log( msg );
  }
}
