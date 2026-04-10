/* Tag filtering + sorting for blog and partners pages */
document.addEventListener('DOMContentLoaded', function(){
  var filterBtns = document.querySelectorAll('[data-filter]');
  var sortSelect = document.querySelector('#sortSelect');
  var cards = document.querySelectorAll('[data-tags]');
  var grid = cards.length > 0 ? cards[0].parentElement : null;

  // Filter
  filterBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      filterBtns.forEach(function(b){ b.classList.remove('active'); });
      this.classList.add('active');
      var tag = this.getAttribute('data-filter');
      cards.forEach(function(card){
        if(tag === 'all' || card.getAttribute('data-tags').indexOf(tag) !== -1){
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Sort
  if(sortSelect){
    sortSelect.addEventListener('change', function(){
      if(!grid) return;
      var arr = Array.from(cards);
      var val = this.value;
      arr.sort(function(a, b){
        if(val === 'name-az') return (a.dataset.name || '').localeCompare(b.dataset.name || '');
        if(val === 'name-za') return (b.dataset.name || '').localeCompare(a.dataset.name || '');
        if(val === 'newest') return (b.dataset.date || '').localeCompare(a.dataset.date || '');
        if(val === 'oldest') return (a.dataset.date || '').localeCompare(b.dataset.date || '');
        return 0;
      });
      arr.forEach(function(card){ grid.appendChild(card); });
    });
  }
});
