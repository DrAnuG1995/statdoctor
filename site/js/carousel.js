/* Center-aligned carousel with prev/next buttons, dots, and auto-play */
document.addEventListener('DOMContentLoaded', function(){
  var track = document.getElementById('carouselTrack');
  var slides = track ? track.querySelectorAll('.carousel-slide') : [];
  var dotsC = document.getElementById('carouselDots');
  var total = slides.length;
  var cur = 0;
  var autoTimer = null;

  if(total === 0) return;

  function getSlideWidth(){ return slides[0] ? slides[0].offsetWidth : 0; }

  function goTo(idx){
    cur = ((idx % total) + total) % total;
    var sw = getSlideWidth();
    var wrap = document.getElementById('phoneCarousel');
    var wrapW = wrap ? wrap.offsetWidth : 0;
    var offset = (wrapW / 2) - (sw / 2) - (cur * sw);
    track.style.transform = 'translateX(' + offset + 'px)';
    slides.forEach(function(s, i){ s.classList.toggle('active', i === cur); });
    var dots = dotsC ? dotsC.querySelectorAll('.carousel-dot') : [];
    dots.forEach(function(d, i){ d.classList.toggle('active', i === cur); });
  }

  // Build dots
  for(var di = 0; di < total; di++){
    var dot = document.createElement('button');
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', 'Go to screenshot ' + (di + 1));
    dot.dataset.idx = di;
    dot.addEventListener('click', function(){ goTo(parseInt(this.dataset.idx)); resetAuto(); });
    dotsC.appendChild(dot);
  }
  goTo(0);

  var prevBtn = document.getElementById('carouselPrev');
  var nextBtn = document.getElementById('carouselNext');
  if(prevBtn) prevBtn.addEventListener('click', function(){ goTo(cur - 1); resetAuto(); });
  if(nextBtn) nextBtn.addEventListener('click', function(){ goTo(cur + 1); resetAuto(); });

  function startAuto(){ autoTimer = setInterval(function(){ goTo(cur + 1); }, 3000); }
  function resetAuto(){ clearInterval(autoTimer); startAuto(); }
  startAuto();

  window.addEventListener('resize', function(){ goTo(cur); });
});
