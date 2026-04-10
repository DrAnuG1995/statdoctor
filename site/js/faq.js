/* FAQ accordion toggle */
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.faq-question').forEach(function(btn){
    btn.addEventListener('click', function(){
      var item = this.closest('.faq-item');
      var wasOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-item.open').forEach(function(el){ el.classList.remove('open'); });
      // Toggle clicked
      if(!wasOpen) item.classList.add('open');
    });
  });
});
