/* Shared Nav + Footer — injected on every page */
(function(){
  var path = window.location.pathname.replace(/\/$/,'');
  var page = path.split('/').pop() || 'index.html';
  if(page === '' || page === 'site') page = 'index.html';

  function isActive(href){
    if(href === 'index.html' && (page === 'index.html' || page === '')) return true;
    return page === href;
  }

  function navLink(href, label){
    var cls = isActive(href) ? ' class="active"' : '';
    return '<a href="'+href+'"'+cls+'>'+label+'</a>';
  }

  /* ── Navigation ── */
  var navHTML = ''
    + '<div class="container">'
    + '  <nav class="nav">'
    + '    <a href="index.html"><img src="https://cdn.prod.website-files.com/688db6d677516719c3925d01/6890a03498323d7b7c29d34e_statdoc_logo.svg" alt="StatDoctor logo" class="nav-logo"></a>'
    + '    <div class="nav-links">'
    +        navLink('index.html','Find Shifts')
    +        navLink('find-doctors.html','Find Doctors')
    +        navLink('blog.html','Blog')
    +        navLink('contact.html','Contact Us')
    + '    </div>'
    + '    <div class="nav-right">'
    + '      <a href="https://linktr.ee/statdoctorau" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">Download App</a>'
    + '    </div>'
    + '    <button class="hamburger" id="hamburgerBtn" aria-label="Menu"><span></span><span></span><span></span></button>'
    + '  </nav>'
    + '  <div class="mobile-menu" id="mobileMenu">'
    +      navLink('index.html','Find Shifts')
    +      navLink('find-doctors.html','Find Doctors')
    +      navLink('blog.html','Blog')
    +      navLink('contact.html','Contact Us')
    + '    <a href="https://linktr.ee/statdoctorau" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="text-align:center">Download App</a>'
    + '  </div>'
    + '</div>';

  var header = document.getElementById('site-nav');
  if(header) header.innerHTML = navHTML;

  /* Hamburger toggle */
  var hBtn = document.getElementById('hamburgerBtn');
  var mMenu = document.getElementById('mobileMenu');
  if(hBtn && mMenu){
    hBtn.addEventListener('click', function(){
      hBtn.classList.toggle('open');
      mMenu.classList.toggle('open');
    });
  }

  /* ── Footer ── */
  var footerHTML = ''
    + '<div class="container">'
    + '  <div class="footer-grid">'
    + '    <div>'
    + '      <img src="https://cdn.prod.website-files.com/688db6d677516719c3925d01/6890a03498323d7b7c29d34e_statdoc_logo.svg" alt="StatDoctor" style="height:28px;filter:brightness(10);margin-bottom:16px">'
    + '      <p class="text-sm" style="line-height:1.6">Australia\'s 1st locum doctor marketplace. Connecting doctors directly with hospitals.</p>'
    + '      <div class="footer-social">'
    + '        <a href="https://www.linkedin.com/company/statdoctor/" target="_blank" rel="noopener" aria-label="LinkedIn"><svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>'
    + '        <a href="https://www.facebook.com/statdoctorau" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>'
    + '        <a href="https://wa.me/61450828219" target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg></a>'
    + '        <a href="https://www.youtube.com/@statdoctor" target="_blank" rel="noopener" aria-label="YouTube"><svg viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>'
    + '      </div>'
    + '    </div>'
    + '    <div>'
    + '      <p class="footer-heading">Pages</p>'
    + '      <ul class="footer-links">'
    + '        <li><a href="index.html">Find Shifts</a></li>'
    + '        <li><a href="find-doctors.html">Find Doctors</a></li>'
    + '        <li><a href="blog.html">Blog</a></li>'
    + '        <li><a href="partners.html">Partners</a></li>'
    + '        <li><a href="contact.html">Contact Us</a></li>'
    + '      </ul>'
    + '    </div>'
    + '    <div>'
    + '      <p class="footer-heading">Contact</p>'
    + '      <ul class="footer-links">'
    + '        <li><a href="tel:+61450828219">+61 450 828 219</a></li>'
    + '        <li><a href="mailto:anu@statdoctor.app">anu@statdoctor.app</a></li>'
    + '      </ul>'
    + '      <p class="footer-heading" style="margin-top:24px">Download</p>'
    + '      <div class="store-badges" style="margin-top:8px">'
    + '        <a href="https://apps.apple.com/au/app/statdoctor/id6452677138" target="_blank" rel="noopener"><img src="https://cdn.prod.website-files.com/688db6d677516719c3925d01/68fa0d2a1d41210a78792018_pngegg%20(2).png" alt="App Store" class="store-badge" style="height:36px"></a>'
    + '        <a href="https://play.google.com/store/apps/details?id=user.statdoctor.app&hl=en_AU" target="_blank" rel="noopener"><img src="https://cdn.prod.website-files.com/688db6d677516719c3925d01/68fa0d1e7e5d4077dcdbc6e7_pngegg%20(1).png" alt="Google Play" class="store-badge" style="height:36px"></a>'
    + '      </div>'
    + '    </div>'
    + '    <div>'
    + '      <p class="footer-heading">Newsletter</p>'
    + '      <p class="text-sm" style="margin-bottom:8px">Get updates on new features and shifts.</p>'
    + '      <form class="newsletter-form" onsubmit="event.preventDefault();this.querySelector(\'input\').value=\'\';alert(\'Thanks for subscribing!\')">'
    + '        <input type="email" placeholder="Your email" class="newsletter-input" required>'
    + '        <button type="submit" class="newsletter-btn">Subscribe</button>'
    + '      </form>'
    + '    </div>'
    + '  </div>'
    + '  <div class="footer-bottom">'
    + '    <span>&copy; 2026 StatDoctor. All rights reserved.</span>'
    + '    <div><a href="privacy-policy.html">Privacy Policy</a><a href="terms-of-use.html">Terms of Use</a></div>'
    + '  </div>'
    + '</div>';

  var footer = document.getElementById('site-footer');
  if(footer) footer.innerHTML = footerHTML;
})();
