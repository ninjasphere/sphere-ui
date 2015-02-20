var C = {};

$(function() {

  $('script[type="text/html"]').each(function(_, s){
    C[$(s).attr('id')] = function(cfg) {
      return $(s).render({cfg:cfg});
    };
  });

  $(document).on('click', 'a[href=#]', function(e) {
    e.preventDefault();
  })

  // optionGroup
  $(document).on('click', '.type-optionGroup .option', function(e) {
    e.preventDefault();
    var opt = $(e.currentTarget);
    var input = opt.find('input')[0];
    input.checked = !input.checked;
    opt.find('a').toggleClass('active', input.checked);
    opt.find('i').toggleClass('fa-square-o', !input.checked).toggleClass('fa-check-square-o', input.checked);
  });

  // inputTimeRange
  $(document).on('click', '.type-inputTimeRange a', function(e) {
    e.preventDefault();
    var a = $(e.currentTarget).addClass('btn-primary').removeClass('btn-default');
    a.parents('.type-inputTimeRange').find('a').not(a).removeClass('btn-primary').addClass('btn-default');
    a.parents('.type-inputTimeRange').find('.row').toggle(!a.hasClass('always')).toggleClass('ignore', a.hasClass('always'));
  });

  $(document).on('submit', 'form', function(e){
    var btn = $(this).find("button:focus" );

    if (!btn.length) {
      // Submitted some other way (like the enter button...) ignore
      e.preventDefault();
      return
    }

    $(this).append('<input type="hidden" name="' + btn.attr('name') + '" value="' + btn.val() + '"/>')

    var action = btn.data('action');

    if (action == 'close') {
      e.preventDefault();
      alert('[closing window]')
    } else {
      $(this).find('[name=action]').val(action);
    }

  });

});
