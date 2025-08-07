;(
function ($, window)
{
    function init_search()
    {
      range_slider();
      token_editor();
      split_button();
    }

    function range_slider()
    {
      // for webkit(chrome,etc)
      //var _R = document.querySelector('[type=range]');
      //    _R.style.setProperty('--val', +_R.value);
      //    _R.style.setProperty('--max', +_R.max);
      //    _R.style.setProperty('--min', +_R.min);
      //    _R.addEventListener('input',
      //        function( e )
      //        {
      //            _R.style.setProperty('--val', +_R.value);
      //        }, false
      //    );

      var items = document.querySelectorAll( 'input[type="range"].slider-progress' );
      Array.prototype.forEach.call( items,
        function ( item )
        {
          item.style.setProperty( '--value', item.value );
          item.style.setProperty( '--min'  , item.min === '' ?   '0' : item.min );
          item.style.setProperty( '--max'  , item.max === '' ? '100' : item.max );
          // item.addEventListener( 'input',
          //     function( e )
          //     {
          //         item.style.setProperty( '--value', item.value )
          //     }, {once : true} //false
          // );
          $( item ).off('input').on('input',
            function( e ) {
              item.style.setProperty( '--value', item.value )
            }
          );
        }
      );

      $( '#fulltextsearch_range_slider_id' ).off('click').on('click',
        function ()
        {
          setTimeout(
            function ()
            {
              $( '#fulltextsearch_query_id' ).focus();
              $( '.chosen-search-input'     ).focus();
              log( 'fulltextsearch_range_slider_id.click' );
            }, 300
          );
        }
      );
    }

    function token_editor()
    {
      var tokens_select_jq = $( '#fulltextsearch_tags_id' );
      if( tokens_select_jq[ 0 ] )
      {
        tokens_select_jq.chosen();
      }
    }

    function run_search()
    {
      $('.vessel-pic-wrapper')
        .css('opacity', '0.4').css('animation-name', 'move-vessel-pic').css('animation-duration', '7s')
        .css('animation-timing-function', 'linear').css('animation-iteration-count', 'infinite');

      $( '#fulltextsearch_submit_id' ).attr( 'disabled', true );
      $( '.gui-popup-button'         ).css( 'cursor', 'not-allowed' ).off( 'focusout' ).off( 'keyup' ).off( 'mousedown' );

      //$( '#fulltextsearch_query_id'  ).attr( 'disabled', true )
      $( '#fulltextsearch_query_id'  ).removeClass( 'form-autocomplete' ).addClass( 'form-autocomplete-run' );
      $( '.chosen-container-multi .chosen-choices').removeClass( 'form-autocomplete-stop' ).addClass( 'form-autocomplete-run' );
      $( '#fulltextsearch_range_slider_id' ).attr( 'disabled', true );

      //$('#search_in_progress').show();

      $.each( $('.project-subcontainer'),
        function()
        {
          $(this).css('display','none');
        }
      );
    }

    window.addEventListener("unload",
      function( e )
        {
            $( '#fulltextsearch_query_id'  ).removeClass( 'form-autocomplete-run' ).addClass( 'form-autocomplete' );
            $( '.chosen-container-multi .chosen-choices').removeClass( 'form-autocomplete-run' ).addClass( 'form-autocomplete-stop' );
            $( '#fulltextsearch_range_slider_id' ).attr( 'disabled', false );
            log( 'fulltextsearch_submit_id.unload' );
        }
    );

    function split_button()
    {
      $( '#fulltextsearch_submit_id' ).off('click').on('click',
        function ()
        {
          run_search();
          log( 'fulltextsearch_submit_id.click' );
        }
      );

      $('#fulltextsearch_query_id').off('keydown').on('keydown',
        function( e )
        {
          if( e.which === 13 )
          {
            run_search();
            log( 'fulltextsearch_query_id.keydown' );

            this.form.submit();
          }
        }
      );

      var pageX = 0, pageY = 0;
      const popupButtons_jq = $( '.gui-popup-button' );

      // ++++ BEGIN FUNCTIONS ++++
      function isFocus( x, y, el )
      {
        const document_jq = $( document );
        y -= document_jq.scrollTop();
        x -= document_jq.scrollLeft();
        const rc = el.getBoundingClientRect();
        return (x >= rc.left) && (x <= rc.right ) &&
               (y >= rc.top ) && (y <= rc.bottom);
      }

      function onPopup( el )
      {
        const el_jq = $( el );

        el_jq.find( '.gui-popup' ).css('opacity', '1');
        //el_jq.find( '.gui-popup-button-svg' ).css('transition-duration', '500ms').css('transform', 'rotateZ(.5turn)');
        el_jq.find( '.gui-popup-button-svg' ).css('transition-duration', '750ms').css('transform', 'rotateZ(.5turn)');

        el_jq.find('a'    ).css('pointer-events', 'auto');
        el_jq.find('label').css('pointer-events', 'auto');
      }

      function offPopup( el )
      {
        const el_jq = $( el );

        el_jq.find( '.gui-popup' ).css('opacity', '0');
        el_jq.find( '.gui-popup-button-svg' ).css('transform', 'none');

        el_jq.find('a'    ).css('pointer-events', 'none');
        el_jq.find('label').css('pointer-events', 'none');

        el.setAttribute( 'aria-expanded', 'false' );
      }

      function toggleItem( attr, el )
      {
        const expanded = ( el.getAttribute( attr ) === 'true' );
        el.setAttribute( attr, !expanded );
        return expanded;
      }
      // ++++ END FUNCTIONS ++++

      // ++++ BEGIN EVENTS ++++
      $( window ).mousemove(
        function( e )
        {
          pageX = e.pageX;
          pageY = e.pageY;
        }
      );

      popupButtons_jq.off('focusout').on('focusout',
        function( e )
        {
          const target = e.currentTarget;
          if( !isFocus( pageX, pageY, target ) )
          {
            if( !isFocus( pageX, pageY, $( target ).find('.gui-popup')[0] ) )
            {
              offPopup( target );
              log( 'blur' );
            }
          }
        }
      );

      popupButtons_jq.off('mousedown').on('mousedown',
        function( e )
        {
          log( 'mousedown' );
          const target = e.currentTarget;
          if( isFocus( pageX, pageY, target ) )
          {
            if( toggleItem( 'aria-expanded', target ) )
            {
              setTimeout(
                function()
                { // timeout for open link location
                  offPopup( target );
                }
                , 300
              );
              log( 'mousedown.blur' );
            }
            else
            {
              setTimeout(
                function()
                {
                  onPopup( target );
                }
                , 100
              );
              log( 'mousedown.focus' );
            }
          }
        }
      );

      popupButtons_jq.off('keyup').on('keyup',
        function( e ) {  // Esc.
          if( e.keyCode === 27 )
          {
            offPopup( e.currentTarget );
            log( 'keyup.esc' );
          }
        }
      );

      // ++++ END EVENTS ++++
    }

})(jQuery, window);

function log( msg )
{
  const use = false;
  if( use )
  {
    console.log( msg );
  }
}
