<?php

class TTokenEditor extends TClassLogger
{
    const T_TOKENS_ERROR   = -1;
    const T_TOKENS_EMPTY   =  0;
    const T_TOKENS_SUCCESS =  1;

    // Parts(token,formela) of mathematical Expression (boolean predicate)
    // Teile(Zeichen) mathematischer Ausdruck (boolesches Prädikat)
    // 1,2,3,4 : token, formula; 5 used to connect two or more tokens,formulas;
    const TOKEN_STEP_TABLE     = 0; // 1. position for tables(+bracket, die Klammer)
    const TOKEN_STEP_COLUMN    = 1; // 2. position for columns of table
    const TOKEN_STEP_OPERATION = 2; // 3. position for operations of column: =, >, <, like, not
    const TOKEN_STEP_VALUE     = 3; // 4. position for values of token
    const TOKEN_STEP_BOOLEAN   = 4; // 5. position for boolean operator (logical operation in Boolean algebra) (+bracket, die Klammer)

    const TOKEN_STEP_COUNT     = 5; // Tokens count

    const T_TOKENS_DATE_FORMAT = APP_DATE_DB_FORMAT;
    const T_TOKENS_SEPARATOR   = ';';

    var $m_pTagSearch = array();

    var $m_pRights = array();

    var $m_pTypes = array();

    var $m_pFields = array();

    var $m_uid = 0;

    var $m_LimitStart = 0;

    const FULL_TEXT_SEARCH_PATH = array(
        'project_view' , 'vessel_view'  ,
        'shipcontract' , 'environmental',
        'file_view'    , 'media_view'   ,
        'contact_view' , 'company_view' ,
        'engine'       , 'engine_family',
    );

    const FULL_TEXT_SEARCH_PATH_WITH_TITLES = array(
        'project_view' => 'Projects',
        'vessel_view'  => 'Fleet',
        'shipcontract' => 'Contracts',
        'environmental'=> 'Environmental',
        'file_view'    => 'Files',
        'media_view'   => 'Documents',
        'contact_view' => 'Contacts',
        'company_view' => 'Companies',
        'engine'       => 'Engines',
        'engine_family'=> 'Engine types',
    );

    const TAG_SEARCH_UI = 'table';
    const TAG_SEARCH_ID = 'text_search';

    public static function from_token( $values )
    {
        return explode( TTokenEditor::T_TOKENS_SEPARATOR, $values );
    }

    public static function to_token( $values )
    {
        return implode( self::T_TOKENS_SEPARATOR, array_filter( array_values( $values ) ) );
    }

    public static function to_date( $date )
    {
        return date( TTokenEditor::T_TOKENS_DATE_FORMAT, strtotime( trim( $date ) ) );
    }

    public static function is_error( $options, $text, $mode )
    {
        return !empty( $options ) && !in_array( $text, $options ) &&
            in_array( $mode, array( TTokenEditor::TOKEN_STEP_TABLE, TTokenEditor::TOKEN_STEP_COLUMN,
                TTokenEditor::TOKEN_STEP_OPERATION, TTokenEditor::TOKEN_STEP_BOOLEAN ) );
    }

    public static function BuildTablesForAutocomplete()
    {
        static $__tables__;
        if( !isset( $__tables__ ) )
        {
            $rights = fulltextsearch_block_build_rights(); // load from static
            $types  = fulltextsearch_block_build_search_path( $rights ); // load from static
            foreach( $types as $type )
            {
                $__tables__[ $type ] = TTokenEditor::SearchTable( $type, 'loadForAutocomplete' );
            }
        }
        return $__tables__;
    }

    public function BuildTablesForSearch( $search )
    {
        static $__tables__;
        if( !isset( $__tables__ ) )
        {
            $__tables__ = array();
        }
        //foreach( TTokenEditor::FULL_TEXT_SEARCH_PATH as $path )
        foreach( $search as $search_item )
        {
            if( is_array( $search_item ) )
            {
                if( array_key_exists( 'path', $search_item ) )
                {
                    $path = $search_item[ 'path' ];
                    if( $this->Validate( $path ) )
                    {
                        if( !array_key_exists( $path, $__tables__ ) )
                        {
                            $__tables__[ $path ] = TTokenEditor::SearchTable( $path, 'loadForSearch' );
                        }
                    }
                }
            }
        }
        return $__tables__;
    }

    static function load_tokens( $user )
    {
        $tags = array();
        if( !empty( $user->uid ) )
        {
            $stmt_select = common_db_prepare_execute(
                'SELECT tokens_logs_id,tokens_logs_name,tokens_logs_short FROM general_tokens_logs WHERE uid=? ORDER BY updated DESC, created DESC', //  LIMIT 25
                array( $user->uid ) );
            while( $fetch = common_db_fetch( $stmt_select ) )
            {
                $tags[ $fetch['tokens_logs_id'] ] = empty( $fetch['tokens_logs_short'] ) ? $fetch['tokens_logs_name'] : $fetch['tokens_logs_short'];
            }
        }
        if( empty( $tags ) ) $tags = array( 0 => 'saved tokens not found ...', );
        return $tags;
    }

    static function load_short( $tokens_logs_id )
    {
        $tokens_logs_short = null;
        if( !empty( $tokens_logs_id ) )
        {
            $stmt_select = common_db_prepare_execute(
                'SELECT tokens_logs_short FROM general_tokens_logs WHERE tokens_logs_id=?',
                array( $tokens_logs_id ) );
            while( $fetch = common_db_fetch( $stmt_select ) )
            {
                $tokens_logs_short = $fetch['tokens_logs_short'];
            }
        }
        return $tokens_logs_short;
    }

    static function load_uid( $tokens_logs_id )
    {
        $uid = null;
        if( !empty( $tokens_logs_id ) )
        {
            $stmt_select = common_db_prepare_execute(
                'SELECT uid FROM general_tokens_logs WHERE tokens_logs_id=?',
                array( $tokens_logs_id ) );
            while( $fetch = common_db_fetch( $stmt_select ) )
            {
                $uid = $fetch['uid'];
            }
        }
        return $uid;
    }

    static function load_token( $tokens_logs_id )
    {
        $tokens = array();
        if( !empty( $tokens_logs_id ) )
        {
            $stmt_select = common_db_prepare_execute(
                'SELECT tokens FROM general_tokens_logs WHERE tokens_logs_id=?',
                array( $tokens_logs_id ) );
            while( $fetch = common_db_fetch( $stmt_select ) )
            {
                $object = base64_decode( $fetch['tokens'] );
                if( $object !== false )
                {
                    $tokens = unserialize( $object );
                }
            }
        }
        return $tokens;
    }

    static function updated_token( $tokens_logs_id )
    {
        common_db_prepare_execute(
            'UPDATE general_tokens_logs SET updated=now() WHERE tokens_logs_id=?',
            array( $tokens_logs_id ) );
    }

    static function save_token( $user, $tags, $status, $tokens_logs_id )
    {
        if( !empty( $user->uid ) )
        {
            $tokens           = base64_encode( serialize( $tags ) );
            $tokens_logs_name = self::toString( $tags );
            if( strlen( $tokens_logs_name ) > 252 )
            {
                $tokens_logs_name = substr( $tokens_logs_name, 0, 252 ) . '...';
            }

            if( empty( $tokens_logs_id ) )
            {
                common_db_prepare_execute(
                    'DELETE FROM general_tokens_logs WHERE uid=? AND tokens_logs_name=?',
                    array( $user->uid, $tokens_logs_name )
                );
                $active_dsn = common_db_insert(
                    'INSERT INTO general_tokens_logs(uid,tokens,status,tokens_logs_name,updated)VALUES(?,?,?,?,now())',
                    array( $user->uid, $tokens, $status, $tokens_logs_name )
                );
                return ( $active_dsn !== false ) ? $active_dsn->_insert_id : null;
            }
            else
            {
                common_db_prepare_execute(
                    'UPDATE general_tokens_logs SET uid=?,tokens=?,status=?,tokens_logs_name=?,updated=now() WHERE tokens_logs_id=?',
                    array( $user->uid, $tokens, $status, $tokens_logs_name, $tokens_logs_id )
                );
                return $tokens_logs_id;
            }
        }
        return null;
    }

    static function restore_last_tokens( $user )
    {
        $ui = 'tokens'; $type = 'fulltextsearch';
        $uif = new TUIFactory( 0 );
        $fulltextsearch = $uif->loadUserPropertyObject( $user->uid, $ui, $type, TUIFactory::UI_PROPERTY_ID_TOKENS );
        unset( $uif );
        return empty( $fulltextsearch ) ? array() : $fulltextsearch;
    }

    static function save_last_tokens( $user, $tags )
    {
        // >>> save last tokens
        $ui = 'tokens'; $type = 'fulltextsearch';
        $uif = new TUIFactory( 0 );
        $uif->saveUserPropertyObject( $user->uid, $ui, $type, TUIFactory::UI_PROPERTY_ID_TOKENS, $tags );
        unset( $uif );
        // <<< save last tokens
    }

    static function autocomplete( $begin, $limit, $search_string, $results_data, &$element, &$mode, &$form_state, $edit_string )
    {
        $results = array();

        $search_string = common_sql_quoter( trim( $search_string ) );
        autocomplete_read( $search_string, $_id_, $search_string );

        $count = 0; $n = 0; $opened = 0; $closed = 0;
        if( !empty( $results_data ) )
        {
            $count = $n = count( $results_data );
            foreach( $results_data as $item )
            {
                if( in_array( $item->text, array( '(', ')' ) ) ) // , '[', ']', '{', '}'
                {
                    $count --;
                }

                if( $item->text == '(' )
                {
                    $opened ++;
                }
                else
                if( $item->text == ')' )
                {
                    $closed ++;
                }
            }
        }

        $mode = $count % self::TOKEN_STEP_COUNT;

        $tables = array();
        if( $mode === self::TOKEN_STEP_BOOLEAN )
        {
            ;
        }
        else
        {
            $tables = self::BuildTablesForAutocomplete();
        }

        if( $mode === self::TOKEN_STEP_TABLE )
        {
            $results = TTokenEditor::FilterTables( $tables, $search_string, null, $begin, $limit );
            if( empty( $results ) && empty( $search_string ) )
            {
                $results = TTokenEditor::FilterTables( $tables, null, null, $begin, $limit );
            }
            $results[ '('  ] = '(';
            //$results[ ')'  ] = ')';

            $element = array(
                '#type'    => 'select',
                '#title'   => 'Table or bracket:',
                '#options' => $results,
            );
        }
        else
        if( $mode === self::TOKEN_STEP_COLUMN )
        {
            $results = TTokenEditor::FilterColumns( $tables, $search_string, $results_data[ $n - 1 ]->text, $begin, $limit );

            $element = array(
                '#type'    => 'select',
                '#title'   => 'Column :',
                '#options' => $results,
                '#attributes' => array( 'style'=>'max-width: 30ch;' ),
            );
        }
        else
        if( $mode === self::TOKEN_STEP_OPERATION )
        {
            $type   = TTokenEditor::getType  ( $tables, $results_data[ $n - 2 ]->text );
            $column = TTokenEditor::getColumn( $tables, $results_data[ $n - 2 ]->text, $results_data[ $n - 1 ]->text, true );
            if( class_exists( $type ) && !empty( $column ) )
            {
                $obj = new $type();
                if( method_exists( $obj, 'getName' ) )
                {
                    foreach( $obj->getName() as $name )
                    {
                        if( !empty( $column ) && $column->_name == $name )
                        {
                            $results[  '='       ] =  '=';
                            $results[ '!='       ] = '!=';
                            $results[     'like' ] =     'like';
                            $results[ 'not like' ] = 'not like';
                            //$results[ '!'  ] = '!';
                        }
                    }
                }

                if( empty( $results ) )
                {
                    if( isset( $column->_flags_1 ) && $column->_flags_1 == 'primary_key' )
                    {
                        $results[     'in'   ] =     'in';
                        $results[ 'not in'   ] = 'not in';

                        $results[     'like' ] =     'like';
                        $results[ 'not like' ] = 'not like';
                        $results[        '=' ] =        '=';
                        $results[       '!=' ] =       '!=';
                    }
                    else
                    if( !empty($column->_fk) && !empty($column->_fk_type) && class_exists( $column->_fk_type ) )
                    {
                        $results[     'in' ] =     'in';
                        $results[ 'not in' ] = 'not in';
                        $results[      '=' ] =      '=';
                        $results[     '!=' ] =     '!=';
                    }
                    else
                    if( !empty($column->_rk) && !empty($column->_rk_type) && class_exists( $column->_rk_type ) )
                    {
                        $results[     'like' ] =     'like';
                        $results[ 'not like' ] = 'not like';
                        $results[        '=' ] =        '=';
                        $results[       '!=' ] =       '!=';
                    }
                    else
                    if( !empty( $column->_decode ) && class_exists( $column->_decode ) )
                    {
                        // switched fields company_id or company_name
                        // for ID
                        $results[       'in' ] =       'in';
                        $results[   'not in' ] =   'not in';
                        // for Name
                        $results[     'like' ] =     'like';
                        $results[ 'not like' ] = 'not like';
                        $results[        '=' ] =        '=';
                        $results[       '!=' ] =       '!=';
                    }

                    if( empty( $results ) )
                    {
                        if( stripos($column->_native_type, 'string' ) !== false || stripos($column->_native_type, 'char' ) !== false )
                        {
                            $results[     'like' ] =     'like';
                            $results[ 'not like' ] = 'not like';
                            $results[        '=' ] =        '=';
                            $results[       '!=' ] =       '!=';
                            //$results[ '!'  ] = '!';
                        }
                        else
                        if( stripos($column->_native_type, 'blob' ) !== false )
                        {
                            $results[     'like' ] =     'like';
                            //$results[ 'not like' ] = 'not like';
                        }
                        else
                        {
                            $results[  '=' ] =  '=';
                            $results[  '>' ] =  '>';
                            $results[  '<' ] =  '<';
                            $results[ '>=' ] = '>=';
                            $results[ '<=' ] = '<=';

                            $results[     'like' ] =     'like';
                            $results[ 'not like' ] = 'not like';
                        }
                    }

                    if( empty($column->_fk) && empty($column->_rk) && empty($column->_decode) && empty( $column->_flags_1 ) )
                    {
                        if( in_array( strtoupper($column->_native_type),
                            array('DATETIME','TIMESTAMP','DATE','NEWDATE','LONG','INT24','INT','DECIMAL','NEWDECIMAL','FLOAT','DOUBLE') ) )
                        {
                            $results[ 'between' ] = 'between';
                        }
                    }
                }

                $element = array(
                    '#type'    => 'select',
                    '#title'   => 'Operation :',
                    '#options' => $results,
                );
            }
        }
        else
        if( $mode === self::TOKEN_STEP_VALUE )
        {
            $related = ($results_data[ $n - 1 ]->text == 'in' || $results_data[ $n - 1 ]->text == 'not in');

            $column = TTokenEditor::getColumn( $tables, $results_data[ $n - 3 ]->text, $results_data[ $n - 2 ]->text, $related );
            if( $results_data[ $n - 1 ]->text == 'between' )
            {
                if( in_array( strtoupper($column->_native_type), array('DATETIME','TIMESTAMP','DATE','NEWDATE') ) )
                {
                    $element = array(
                        '#type' => 'container',
                    );
                    $locale = TLocale::get_instance_locale();
                    $element['from'] = array(
                        '#type'                => $locale['date_type'],
                        '#title'               => 'From : ',
                        //'#date_title'          => 'From',
                        '#date_label_position' => 'within',
                        '#date_format'         => TTokenEditor::T_TOKENS_DATE_FORMAT,
                        '#date_timezone'       => $locale['time_zone'      ],
                        '#date_increment'      => $locale['date_increment' ],
                        '#date_year_range'     => $locale['date_year_range'],
                        '#suffix' => '<div class="clear" style="display:block; margin-top:8px;"></div>',
                        '#pre_render'          => array( 'search_general_date_prerender' ),
                    );
                    $element['to'] = array(
                        '#type'                => $locale['date_type'],
                        '#title'               => 'To : ',
                        //'#date_title'          => 'To',
                        '#date_label_position' => 'within',
                        '#date_format'         => TTokenEditor::T_TOKENS_DATE_FORMAT,
                        '#date_timezone'       => $locale['time_zone'      ],
                        '#date_increment'      => $locale['date_increment' ],
                        '#date_year_range'     => $locale['date_year_range'],
                        '#pre_render'          => array( 'search_general_date_prerender' ),
                    );
                    if( empty( $search_string ) )
                    {
                        $temp_date = date( TTokenEditor::T_TOKENS_DATE_FORMAT, strtotime( 'now' ) );
                        $results = array( $temp_date.';'.$temp_date => $temp_date.';'.$temp_date );
                    }
                }
                else
                {
                    $element = array(
                        '#type' => 'container',
                    );
                    $element[ 'from' ] = array(
                        '#type'   => 'textfield',
                        '#title'  => 'From :',
                        '#size'   => 6,
                        '#suffix' => '<div class="clear" style="display:block; margin-top:8px;"></div>',
                    );
                    $element[ 'to' ] = array(
                        '#type'   => 'textfield',
                        '#title'  => 'To :',
                        '#size'   => 6,
                    );
                    if( empty( $search_string ) )
                    {
                        $results = array( '0;0' => '0;0' );
                    }
                }
            }
            else
            if( $results_data[ $n - 1 ]->text == 'in' || $results_data[ $n - 1 ]->text == 'not in' )
            {
                if( !empty( $column->_fk ) && !empty( $column->_fk_type ) )
                {
                    $results = TTokenEditor::loadForDictionary( $column->_fk_type, $begin, $limit, $search_string );
                    $element = array(
                        '#type'     => 'checkboxes',
                        '#title'    => 'Value :',
                        '#options'  => $results,
                        '#multiple' =>  TRUE,
                    );
                }
                else
                if( !empty( $column->_decode ) && class_exists( $column->_decode ) )
                {
                    list( $table, $id, $name, $is_dictionary ) = self::decodeType( $column->_decode );
                    if( $is_dictionary )
                    {
                        $results = TTokenEditor::loadForDictionary( $column->_decode, $begin, $limit, $search_string );
                        $element = array(
                            '#type'     => 'checkboxes',
                            '#title'    => 'Value :',
                            '#options'  => $results,
                            '#multiple' =>  TRUE,
                        );
                    }
                    else
                    {
                        if( empty( $search_string ) )
                        {
                            $results = array( 'not defined[id:0]' => 'not defined[id:0]' );
                        }

                        $items = array();
                        foreach( explode( ';', $edit_string ) as $item )
                        {
                            if( _autocomplete_read( $item, $_id, $_item ) )
                            {
                                $items[] = $_id;
                            }
                        }

                        $form_items = array();
                        add_fulltextsearch_general_items( $table, $items, $column->_decode, $form_items, $form_state );
                        foreach( $form_items as $form_item )
                        {
                            $element = $form_item;
                        }
                    }
                }
                else
                if( isset( $column->_flags_1 ) && $column->_flags_1 == 'primary_key' )
                {
                    if( empty( $search_string ) )
                    {
                        $results = array( 'not defined[id:0]' => 'not defined[id:0]' );
                    }

                    $items = array();
                    foreach( explode( ';', $edit_string ) as $item )
                    {
                        if( _autocomplete_read( $item, $_id, $_item ) )
                        {
                            $items[] = $_id;
                        }
                    }

                    $form_items = array();
                    add_fulltextsearch_general_items( $column->_table, $items, $column->_type, $form_items, $form_state );
                    foreach( $form_items as $form_item )
                    {
                        $element = $form_item;
                    }
                }
            }
            else
            if( $results_data[ $n - 1 ]->text == '=' || $results_data[ $n - 1 ]->text == '!=' )
            {
                $type = TTokenEditor::getType( $tables, $results_data[ $n - 3 ]->text );
                //$column = TTokenEditor::getColumn( $tables, $results_data[ $n - 3 ]->text, $results_data[ $n - 2 ]->text );

                if( !empty( $column->_fk ) && !empty( $column->_fk_type ) )
                {
                    $results = TTokenEditor::loadForDictionary( $column->_fk_type, $begin, $limit, $search_string );

                    if( count( $results ) < 100 )
                    {
                        $element = array(
                            '#type'    => 'select',
                            '#title'   => 'Value :',
                            '#options' => $results,
                        );
                    }
                    else
                    {
                        $element = array(
                            '#type'    => 'textfield',
                            '#title'   => 'Value :',
                            '#size'    => 38,
                            '#autocomplete_path' => 'autocomplete/'.$column->_fk_type.'/0/0/0',
                        );
                    }
                }
                if( empty( $results ) )
                {
                    if( class_exists( $type ) && !empty( $column ) )
                    {
                        $obj = new $type();
                        if( method_exists( $obj, 'getName' ) )
                        {
                            foreach( $obj->getName() as $name )
                            {
                                if( !empty( $column ) && $column->_name == $name )
                                {
                                    // ??????
                                    $results = _Autocomplete_( $type, 0, $begin, $limit, $search_string );

                                    $element = array(
                                        '#type'    => 'textfield',
                                        '#title'   => 'Value :',
                                        '#size'    => 38,
                                        '#autocomplete_path' => 'autocomplete/'.$type.'/0/0/0',
                                    );
                                }
                            }
                        }
                        unset( $obj );
                    }
                }
            }

            if( empty( $element ) && !empty( $column ) &&
                in_array( strtoupper($column->_native_type), array('DATETIME','TIMESTAMP','DATE','NEWDATE') ) )
            {
                if( $results_data[ $n - 1 ]->text == 'like' || $results_data[ $n - 1 ]->text == 'not like' )
                {
                }
                else
                {
                    $locale = TLocale::get_instance_locale();
                    $element = array(
                        '#type'                => $locale['date_type'],
                        '#title'               => 'Value : ',
                        //'#date_title'          => 'Value',
                        '#date_label_position' => 'within',
                        '#date_format'         => TTokenEditor::T_TOKENS_DATE_FORMAT,
                        '#date_timezone'       => $locale['time_zone'      ],
                        '#date_increment'      => $locale['date_increment' ],
                        '#date_year_range'     => $locale['date_year_range'],
                        '#pre_render'          => array( 'search_general_date_prerender' ),
                    );
                    if( empty( $search_string ) )
                    {
                        $temp_date = date( TTokenEditor::T_TOKENS_DATE_FORMAT, strtotime( 'now' ) );
                        $results = array( $temp_date => $temp_date );
                    }
                }
            }
        }
        else
        if( $mode === self::TOKEN_STEP_BOOLEAN )
        {
            $results[ 'and' ] = 'and';
            $results[ 'or'  ] = 'or';
            $results[ ';'   ] = ';';

            if( $opened == $closed )
            {
                $element = array(
                    '#type'    => 'select',
                    '#title'   => 'Boolean or separator :',
                    '#options' => $results,
                );
            }
            else
            if( $opened > $closed )
            {
                $results[ ')'  ] = ')';
                $element = array(
                    '#type'    => 'select',
                    '#title'   => 'Boolean, bracket or separator :',
                    '#options' => $results,
                );
            }
        }

        return $results;
    }

    public function toWhere( $q )
    {
        $rc = array();

        $count = 0; $N = 0;
        for( $n =0, $len = count( $q ); $n < $len; $n ++ )
        {
            if( in_array( $q[ $n ], array( '(', ')', 'and', 'or', ';' ) ) ) // , '[', ']', '{', '}'
            {
                $rc[ $n ] = $q[ $n ];
                continue;
            }

            switch( $count % 4 )
            {
                case 0 :
                    {
                        $N = $n;
                        if( !array_key_exists( $N, $rc ) )
                        {
                            $rc[ $N ] = array();
                        }
                        $rc[ $N ] = array_merge( $rc[ $N ], array( 'table' => $q[ $n ] ) );
                    } break;
                case 1 : $rc[ $N ] = array_merge( $rc[ $N ], array( 'column' => $q[ $n ] ) ); break;
                case 2 : $rc[ $N ] = array_merge( $rc[ $N ], array( 'op'     => $q[ $n ] ) ); break;
                case 3 : $rc[ $N ] = array_merge( $rc[ $N ], array( 'val'    => $q[ $n ] ) ); break;
            }
            $count ++;
        }

        return $rc;
    }
    public function BuildWhere( $tokens, $tables )
    {
        $where = array();
        foreach( $tokens as $n => $token )
        {
            if( is_array( $token ) )
            {
                $table = $token[ 'table' ];
                $_path_  = TTokenEditor::getPath ( $tables, $table );
                $_table_ = TTokenEditor::getTable( $tables, $table );
                if( !empty( $_table_ ) )
                {
                    $type = $_table_[ 'type' ];
                    if( class_exists( $type ) )
                    {
                        $column = $token[ 'column' ];
                        $related = ($token['op'] == 'in' || $token['op'] == 'not in');
                        $_column_ = TTokenEditor::getColumn( $tables, $table, $column, $related );
                        if( !empty( $_column_ ) )
                        {
                            $where[] = array(
                                'label' => ( $table . '.' . $column ),
                                'path' => $_path_, 'table' => $_column_->_table, 'column' => $_column_->_name,
                                'op' => $token[ 'op' ], 'val' => $token[ 'val' ], 'type' => $_column_->_native_type,
                                'fk' => $_column_->_fk, 'fk_type' => $_column_->_fk_type,
                                'rk' => $_column_->_rk, 'rk_type' => $_column_->_rk_type,
                                'relation_table_id' => $_column_->_relation_table_id,
                            );
                        }
                    }
                }
            }
            else
            {
                $where[] = $token;
            }
        }
        return $where;
    }

    static function toString( $q )
    {
        $rc = '';

        $count = 0;
        for( $n =0, $len = count( $q ); $n < $len; $n ++ )
        {
            if( in_array( $q[ $n ], array( '(', ')' ) ) ) // , '[', ']', '{', '}'
            {
                $rc .= $q[ $n ];
                continue;
            }
            switch( $count % 5 )
            {
                case 0 : $rc .= '\'' . $q[ $n ] . '\':'; break;
                case 1 : $rc .= '\'' . $q[ $n ] . '\' '; break;
                case 2 : $rc .=        $q[ $n ] . ' '  ; break;
                case 3 :
                        {
                            if( strlen( $q[ $n ] ) > 33 )
                            {
                                $rc .= '\'' . substr( $q[ $n ], 0, 33 ) . '...\' ';
                            }
                            else
                            {
                                $rc .= '\'' . $q[ $n ] . '\' ';
                            }
                        } break;
                case 4 : $rc .=        $q[ $n ] . ' '  ; break;
            }

            $count ++;
        }
        return $rc;
    }

    public function BuildResults( $tables, $search )
    {
        $expressions = array(); $n = 0;
        foreach( $search as $item )
        {
            if( $item == ';' )
            {
                $n ++;
                continue;
            }
            $expressions[ $n ][] = $item;
        }

        $Values = array();
        foreach( $expressions as $n => $expression )
        {
            foreach( TTokenEditor::FULL_TEXT_SEARCH_PATH as $path )
            {
                if( $this->Validate( $path ) )
                {
                    if( array_key_exists( $path, $tables ) )
                    {
                        $_table_ = $tables[ $path ];
                        if( array_key_exists( 'type', $_table_ ) )
                        {
                            $Type = $_table_[ 'type' ];
                            if( class_exists( $Type ) )
                            {
                                $Obj = new $Type();

                                //$Type .= '('.$n.')';
                                $Type .= '_'.$n.'_';

                                if( method_exists( $Obj, 'getPK' ) && method_exists( $Obj, 'getName' ) && method_exists( $Obj, 'getTable' )  )
                                {
                                    $ff = $_table_[ 'form' ];

                                    $where = ''; $label_where = '';
                                    if( $path == 'file_view' )
                                    {
                                        list( $where, $label_where ) = $this->extractWhere( $expression, $Obj->getTable(), 'file' );
                                        $Values[ $Type ][ 'results' ] = $this->ElasticSearch( $ff, $where, $this->getRights() );
                                    }

                                    if( empty( $where ) )
                                    {
                                        list( $where, $label_where, $raw_where ) = $ff->extractWhere( $expression );
                                        $Values[ $Type ][ 'results' ] =
                                            $this->Load(
                                                $ff, self::TAG_SEARCH_ID, self::TAG_SEARCH_UI,
                                                $Obj->getPK(), $where, $raw_where, $expression, $this->getRights()
                                            );
                                    }

                                    $Values[ $Type ][ 'label_where' ] = $label_where;
                                    $Values[ $Type ][ 'path'        ] = $path;
                                    $Values[ $Type ][ 'label'       ] = $_table_[ 'label' ];
                                }
                                unset( $Obj );
                            }
                        }
                    }
                }
            }
        }

        return $Values;
    }

    public function extractWhere( $search_items, $table, $column ) // 'crm_file_view' 'file'
    {
        $_where_array_ = array(); $_label_array_ = array(); $found = false;
        foreach( $search_items as $search_item )
        {
            if( !is_array( $search_item ) )
            {
                if( in_array( $search_item, array( 'and', 'or' ) ) )
                {
                    if( $found )
                    {
                        $_where_array_[] = $search_item;
                        $_label_array_[] = $search_item;
                    }
                }
                else
                {
                    $_where_array_[] = $search_item;
                    $_label_array_[] = $search_item;
                }
                continue;
            }

            $found = false;
            if( $search_item[ 'table' ] == $table && $search_item[ 'column' ] == $column && !empty( $search_item[ 'val' ] ) )
            {
                $_where_array_[] = $search_item[ 'val' ];
                //$_label_array_[] = $search_item[ 'val' ];
                $_label_array_[] = implode( ' ', array( $search_item[ 'label' ], $search_item[ 'op'  ], $search_item[ 'val' ] ) );
                $found = true;
            }
        }
        return array( clearWhere( $_where_array_ ), clearWhere( $_label_array_ ) );
    }

    public function ElasticSearch( $ff, $where, $rights )
    {
        $results = array();
        if( !empty( $where ) && $rights[ 'use elasticsearch search' ] )
        {
            $results[ 'ff' ] = $ff;
            if( class_exists('TElasticsearchFactory') && function_exists( 'Elasticsearch' ) )
            {
                $query = TFormDataFormatterElastic::prepare_fulltextsearch_elastic( $where );
                $esf = new TElasticsearchFactory();
                $results[ 'values' ] = Elasticsearch( $esf, $query );
                unset( $esf );

                global $user;
                Log('TTokenEditor::ElasticSearch User/SQL: '.$user->uid.' : '.$where, '_fulltextsearch_request');
            }
        }
        return $results;
    }

    public function Load( TFormFactory $ff, $area_search, $area_results, $pks, $search, $raw_search, $expression, $rights )
    {
        $default_column = $ff->getProperty( $area_search, TFormFactory::FORM_DEFAULT_TABLE_COLUMN );
        $default_order  = $ff->getProperty( $area_search, TFormFactory::FORM_DEFAULT_TABLE_ORDER  );
        $rows_limit     = $ff->getProperty( $area_search, TFormFactory::FORM_DEFAULT_ROWS_LIMIT   );

        $ff->generateQueryTagSearch
        (
            $area_search,
            array( 'sql' => $default_column, 'sort' => $default_order ),
            $search,
            $raw_search,
            $expression,
            array(),
            array( 'start' => $this->m_LimitStart, 'limit' => $rows_limit ),
            $rights,
            $this->getUID()
        );
        $sql_select = $ff->getProperty( $area_search, TFormFactory::FORM_SQL_SELECT );
        $sql_where  = $ff->getProperty( $area_search, TFormFactory::FORM_WHERE      );

        $Values = array();
        $Values[ 'pk'     ] = implode( ',', $pks );
        $Values[ 'ids'    ] = array();
        $Values[ 'values' ] = array();
        $Values[ 'ff'     ] = $ff;

        if( !empty( $sql_where )  )
        {
            $stmt = common_db_prepare_execute( $sql_select, array() );
            while( $item = common_db_fetch( $stmt ) )
            {
                if( !empty( trim( $item[ $Values[ 'pk' ] ] ) ) )
                {
                    $Values[ 'ids' ][] = $item[ $Values[ 'pk' ] ];
                }
                else
                {
                    //
                }
            }

            global $user;
            Log('TTokenEditor::Load User/SQL: '.$user->uid.' : '.$sql_select, '_fulltextsearch_request');
        }

        if( count( $Values[ 'ids' ] ) > 0 )
        {
            $default_column = $ff->getProperty( $area_results, TFormFactory::FORM_DEFAULT_TABLE_COLUMN );
            $default_order  = $ff->getProperty( $area_results, TFormFactory::FORM_DEFAULT_TABLE_ORDER  );

            $ff->generateQueryFullTextSearch
            (
                $area_results,
                array( 'sql' => $default_column, 'sort' => $default_order ),
                array(),
                $Values[ 'ids' ],
                array( 'start' => $this->m_LimitStart, 'limit' => $rows_limit ),
                $rights,
                $this->getUID()
            );

            $sql_select = $ff->getProperty( $area_results, TFormFactory::FORM_SQL_SELECT );
            $sql_where  = $ff->getProperty( $area_results, TFormFactory::FORM_WHERE      );

            if( !empty( $sql_where )  )
            {
                $stmt = common_db_prepare_execute( $sql_select, array() );
                while( $item = common_db_fetch( $stmt ) )
                {
                    $Values[ 'values' ][] = $item;
                }
            }
        }

        return $Values;
    }

    public function Validate( $type )
    {
        return in_array( $type, $this->getTypes() );
    }

    public function setTagSearch( $pTagSearch )
    {
        $this->m_pTagSearch = $pTagSearch;
    }

    public function getTagSearch()
    {
        return $this->m_pTagSearch;
    }

    public function getRights()
    {
        return $this->m_pRights;
    }

    public function getTypes()
    {
        return $this->m_pTypes;
    }

    public function getFields()
    {
        return $this->m_pFields;
    }

    public function getUID()
    {
        return $this->m_uid;
    }

    public function __construct( $pTagSearch, $pRights, $pTypes, $uid )
    {
        $this->m_pTagSearch = $pTagSearch;
        $this->m_pRights    = $pRights;
        $this->m_pTypes     = $pTypes;
        $this->m_uid        = $uid;
    }

    public static function getTable( $tables, $label )
    {
        foreach( $tables as $id => $table )
        {
            if( $table[ 'label' ] == $label )
            {
                return $table;
            }
        }
        return null;
    }

    public static function getPath( $tables, $label )
    {
        foreach( $tables as $id => $table )
        {
            if( $table[ 'label' ] == $label )
            {
                return $id;
            }
        }
        return null;
    }

    public static function getType( $tables, $label )
    {
        $table = self::getTable( $tables, $label );
        return empty( $table ) ? null : $table[ 'type' ];
    }

    public static function getColumn( $tables, $tbl_label, $col_label, $related = false )
    {
        $table = self::getTable( $tables, $tbl_label );
        if( !empty( $table ) )
        {
            if( array_key_exists( 'columns', $table ) )
            {
                foreach( $table[ 'columns' ] as $column )
                {
                    if( isset( $column->_flags_1 ) && $column->_flags_1 == 'primary_key' )
                    {
                        continue;
                    }
                    if( $column->_label == $col_label )
                    {
                        if( $related && !empty( $column->_control_values ) )
                        {
                            foreach( $table[ 'columns' ] as $related_id )
                            {
                                if( $related_id->_name != $column->_name &&
                                    $related_id->_name == $column->_control_values )
                                {
                                    if( !empty( $related_id->_fk ) )
                                    {
                                        return $related_id;
                                    }
                                    if( !empty( $related_id->_decode ) && class_exists( $related_id->_decode ) )
                                    {
                                        return $related_id;
                                    }
                                    if( isset( $related_id->_flags_1 ) && $related_id->_flags_1 == 'primary_key' )
                                    {
                                        return $related_id;
                                    }
                                }
                            }
                        }
                        return $column;
                    }
                }
            }
            else
            if( array_key_exists( 'form', $table ) )
            {
                $form_items = $table[ 'form' ]->getForm( self::TAG_SEARCH_UI );
                foreach( $form_items as $column )
                {
                    if( $column->_label == $col_label )
                    {
                        if( $related && !empty( $column->_control_values ) )
                        {
                            foreach( $table[ 'columns' ] as $related_id )
                            {
                                if( $related_id->_name != $column->_name &&
                                    $related_id->_name == $column->_control_values &&
                                    ( !empty( $related_id->_fk ) || ( !empty( $related_id->_decode ) ) && class_exists( $related_id->_decode ) ) )
                                {
                                    return $related_id;
                                }
                            }
                        }
                        return $column;
                    }
                }
            }
        }
        return null;
    }

    public static function FilterTables( $tables, $search_string, $path, $begin, $limit )
    {
        $rc = array();

        if( $begin >= 0 && $limit > 0 && $begin < $limit )
        {
            $i = 0;
            foreach( $tables as $id => $table )
            {
                if( empty( $id ) )
                {
                    continue;
                }
                if( !empty( $path ) && $id != $path )
                {
                    continue;
                }

                $label = $table[ 'label' ];

                if( empty( $label ) )
                {
                    continue;
                }
                if( !empty( $search_string ) && stripos( $label, $search_string ) === false )
                {
                    continue;
                }

                if( $i >= $begin )
                {
                    $rc[ $label ] = $label;
                }

                if( $i >= $limit )
                {
                    break;
                }

                $i ++;
            }
        }

        return $rc;
    }

    public static function FilterColumns( $tables, $search_string, $path, $begin, $limit )
    {
        $rc = array();

        if( $begin >= 0 && $limit > 0 && $begin < $limit )
        {
            $i = 0;
            foreach( $tables as $id => $table )
            {
                $label = $table[ 'label' ];

                if( !empty( $path ) && $label != $path )
                {
                    continue;
                }

                foreach( $table[ 'columns' ] as $column )
                {
                    $col = empty( $path ) ? ( $label . ':' . $column->_label ) : $column->_label;

                    if( empty( $col ) || !$column->_published || $column->_control_hide ) // || $column->_rk
                    {
                        continue;
                    }
                    if( !empty( $search_string ) && stripos( $col, $search_string ) === false )
                    {
                        continue;
                    }

                    if( $i >= $begin )
                    {
                        $rc[ $col ] = $col;
                    }

                    if( $i >= $limit )
                    {
                        break 2;
                    }

                    $i ++;
                }
            }
        }

        return $rc;
    }

    public static function loadForSearch( $path )
    {
        $Values = array();
        $stmt = common_db_prepare_execute( 'SELECT * FROM general_ui_type WHERE LOWER(path)=?', array( $path ) );
        while( $value = common_db_fetch( $stmt ) )
        {
            $Values[ 'form'    ] = self::LoadForm( new TFormFactory( self::TAG_SEARCH_UI, self::TAG_SEARCH_ID ), $path );
            $Values[ 'type'    ] = $value[ 'type'  ];
            $Values[ 'label'   ] = $value[ 'label' ];
            $Values[ 'path'    ] = $path;
        }
        unset( $stmt );
        return $Values;
    }

    public static function loadForAutocomplete( $path )
    {
        $Values = array();
        $stmt = common_db_prepare_execute( 'SELECT * FROM general_ui_type WHERE LOWER(path)=?', array( $path ) );
        while( $value = common_db_fetch( $stmt ) )
        {
            $ff = self::LoadForm( new TFormFactory( self::TAG_SEARCH_UI ), $path );
            $Values[ 'columns' ] = self::LoadColumns( $ff, self::TAG_SEARCH_UI );
            $Values[ 'type'    ] = $value[ 'type'  ];
            $Values[ 'label'   ] = $value[ 'label' ];
            $Values[ 'path'    ] = $path;
            unset( $ff );
        }
        unset( $stmt );
        return $Values;
    }

    public static function decodeType( $Type )
    {
        $rc = array( null, null, null, null );

        $Obj = new $Type();
        if( method_exists( $Obj, 'isDictionary' ) && method_exists( $Obj, 'getPK' ) && method_exists( $Obj, 'getName' ) && method_exists( $Obj, 'getTable' )  )
        {
            if( /*$Obj->isDictionary()*/ !empty( $Obj->getName() ) )
            {
                $rc = array( $Obj->getTable(), implode( ',', $Obj->getPK() ), implode( ',', $Obj->getName() ), $Obj->isDictionary() );
            }
        }
        return $rc;
    }

    public static function loadForDictionary( $Type, $begin, $limit, $search_string )
    {
        $Values = array();

        if( class_exists( $Type ) )
        {
            $Obj = new $Type();
            if( method_exists( $Obj, 'isDictionary' ) && method_exists( $Obj, 'getPK' ) && method_exists( $Obj, 'getName' ) && method_exists( $Obj, 'getTable' )  )
            {
                if( /*$Obj->isDictionary()*/ !empty( $Obj->getName() ) )
                {
                    $search_string = trim( $search_string );
                    $name = implode(',',array_merge($Obj->getPK(),$Obj->getName()));
                    $sql =
                         'SELECT '   .$name
                        .' FROM '    .$Obj->getTable()
                        //.( empty($search_string) ? '' : (' WHERE '.$name.' LIKE %'.$search_string.'%') )
                        .' ORDER BY '.implode(' ASC,',$Obj->getName()) . ' ASC';
                    $stmt = common_db_prepare_execute( $sql, array() );
                    while( $value = common_db_fetch( $stmt ) )
                    {
                        foreach( $Obj->getPK() as $pk )
                        {
                            $full_name = '';
                            foreach( $Obj->getName() as $name )
                            {
                                $full_name .= $value[ $name ] . ' ';
                            }
                            $full_name = trim( $full_name );
                            if( !empty( $search_string ) && stripos( $full_name, $search_string ) === false )
                            {
                                continue;
                            }
                            $Values[ get_name_id( $full_name, $value[ $pk ] ) ] = $full_name;
                            break;
                        }

//                        if( $limit > 0 && count( $Values ) > $limit )
//                        {
//                            break;
//                        }
                    }
                    unset( $stmt );
                }
            }
            unset( $obj );
        }

        return $Values;
    }

    public static function getID( $path, $loader )
    {
        return md5( APP_MEMCACHE_PREFIX . static::class . $loader . $path );
    }

    public static function SearchTable( $path, $loader )
    {
        $Values = array();
        if( !empty( $path ) )
        {
            $memcache = new Memcache();
            $rc = $memcache->connect( APP_MEMCACHE_SERV, APP_MEMCACHE_PORT );
            if( $rc )
            {
                $memcache_key = self::getID( $path, $loader );
                $rc = $memcache->get( $memcache_key );
                if( $rc === FALSE )
                {
                    if( method_exists( 'TTokenEditor', $loader ) )
                    {
                        $Values = self::$loader( $path );
                        $rc = $memcache->set( $memcache_key, $Values, MEMCACHE_COMPRESSED, APP_MEMCACHE_EXPIRE );
                        if( $rc === FALSE )
                        {
                            Log( $path . ': cannot save key=' . $memcache_key, '_memcache_error' );
                        }
                        else
                        {
                            Log( $path . ': saved key=' . $memcache_key, '_memcache' );
                        }
                    }
                    else
                    {
                        Log( $path . ': unknown loader ' . $loader, '_memcache' );
                    }
                }
                else
                {
                    $Values = $rc;
                    Log( $path . ': loaded key=' . $memcache_key, '_memcache' );
                }
            }
            else
            {
                Log( $path . ': cannot connect to memcache server', '_memcache_error' );
                if( method_exists( 'TTokenEditor', $loader ) )
                {
                    $Values = self::$loader( $path );
                }
                else
                {
                    Log( $path . ': unknown loader ' . $loader, '_memcache' );
                }
            }
            unset( $memcache );
        }
        return $Values;
    }

    public static function LoadForm( $ff, $path )
    {
        $ff->loadForms( TUser::UID_ADMIN, $path );
        return $ff;
    }

    public static function LoadColumns( $ff, $ui )
    {
        $columns = array();

        $form_items = $ff->getForm( $ui );
        if( !empty( $form_items ) )
        {
            foreach( $form_items as $form_item )
            {
                if(
                       is_object( $form_item )
                    && $form_item->isPublished()
                    //&& !$form_item->_fk && !$form_item->_rk
                )
                {
//                    if(  isset( $form_item->_flags_1 ) && $form_item->_flags_1 == 'primary_key' )
//                    {
//                        continue;
//                    }

                    $columns[] = $form_item;
                }
            }
        }

        return $columns;
    }

}
