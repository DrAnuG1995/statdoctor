/* Contact form validation and submission */
document.addEventListener('DOMContentLoaded', function(){
  var form = document.getElementById('contactForm');
  if(!form) return;

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var valid = true;
    form.querySelectorAll('[required]').forEach(function(field){
      if(!field.value.trim()){
        field.style.borderColor = '#E53E3E';
        valid = false;
      } else {
        field.style.borderColor = '';
      }
    });
    var email = form.querySelector('[type="email"]');
    if(email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)){
      email.style.borderColor = '#E53E3E';
      valid = false;
    }
    if(!valid) return;

    // Show success
    form.innerHTML = '<div class="text-center" style="padding:40px 0"><svg width="48" height="48" fill="none" stroke="#16a34a" stroke-width="2" viewBox="0 0 24 24" style="margin:0 auto 16px;display:block"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11.5 14.5 16 10"/></svg><h3 style="margin-bottom:8px">Message sent!</h3><p class="text-muted">A member of the team will be in touch.</p></div>';
  });
});
