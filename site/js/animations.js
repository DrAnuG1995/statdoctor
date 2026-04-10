/* Scroll-triggered fade-up animations */
document.addEventListener('DOMContentLoaded', function(){
  var observer = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  }, {threshold: 0.05});
  document.querySelectorAll('.animate').forEach(function(el){
    observer.observe(el);
  });
});
