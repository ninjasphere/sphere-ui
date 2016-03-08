var C = {};

$(function() {

  /*//uses document because document will be topmost level in bubbling
  $(document).on('touchmove',function(e){
    e.preventDefault();
  });
  //uses body because jquery on events are called off of the element they are
  //added to, so bubbling would not work if we used document instead.
  $('body').on('touchstart','.scrollable',function(e) {
    if (e.currentTarget.scrollTop === 0) {
      e.currentTarget.scrollTop = 1;
    } else if (e.currentTarget.scrollHeight === e.currentTarget.scrollTop + e.currentTarget.offsetHeight) {
      e.currentTarget.scrollTop -= 1;
    }
  });
  //prevents preventDefault from being called on document if it sees a scrollable div
  $('body').on('touchmove','.scrollable',function(e) {
    e.stopPropagation();
  });*/

  $('script[type="text/html"]').each(function(_, s){
    C[$(s).attr('id')] = function(cfg) {
      return $(s).render({cfg:cfg});
    };
  });

  $(document).on('click', 'a[href=#]', function(e) {
    e.preventDefault();
  })

  // optionGroup
  $(document).on('tap', '.type-optionGroup .option, .type-inputCheckbox', function(e) {
    e.preventDefault();
    var opt = $(e.currentTarget);
    var input = opt.find('input')[0];
    input.checked = !input.checked;
    opt.find('a').toggleClass('active', input.checked);
    opt.find('i').toggleClass('fa-square-o', !input.checked).toggleClass('fa-check-square-o', input.checked);
  });

  // radioGroup
  $(document).on('tap', '.type-radioGroup .option', function(e) {
    e.preventDefault();
    var opt = $(e.currentTarget);
    var input = opt.find('input')[0];
    input.checked = true;
    opt.parents('.type-radioGroup').find('.btn-primary').removeClass('btn-primary').addClass('btn-default');
    opt.find('a').removeClass('btn-default').addClass('btn-primary');
  });

  // inputTimeRange
  $(document).on('tap', '.type-inputTimeRange a', function(e) {
    e.preventDefault();
    var a = $(e.currentTarget).addClass('btn-primary').removeClass('btn-default');
    a.parents('.type-inputTimeRange').find('a').not(a).removeClass('btn-primary').addClass('btn-default');
    a.parents('.type-inputTimeRange').find('.row').toggle(!a.hasClass('always')).toggleClass('ignore', a.hasClass('always'));
  });

  $(document).on('tap', 'form button', function(e){
    var btn = $(this);

    console.log("button", btn)

    if (!btn.length) {
      // Submitted some other way (like the enter button...) ignore
      e.preventDefault();
      return
    }

    e.stopImmediatePropagation();
    e.preventDefault();

    var action = btn.data('action');

    if (action == 'undefined') {
      // No action.
      return;
    }

    btn.html('<i class="fa fa-circle-o-notch fa-spin"/>&nbsp;');

    var form = btn.parents('form');

    if (btn.attr('name')) {
      form.append('<input type="hidden" name="' + btn.attr('name') + '" value="' + btn.val() + '"/>');
    }

    if (action == 'close') {
      $('#menu').show();
      $('#out').empty();
      return;
    }

    form.find('[name=action]').val(action);
    form.submit();
  });

});
