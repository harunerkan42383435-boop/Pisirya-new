/* Seven interface languages; untranslated recipe instructions remain Turkish. */
window.NP_I18N = {
 choose: function(language,tr,en){ if(language==='pl'){var m=String(tr).match(/^Adımlardaki miktarlar orijinal (\d+) kişilik ölçüyü anlatır\./); if(m)return 'Ilości w opisie dotyczą '+m[1]+' porcji. Dla wybranej liczby porcji użyj listy powyżej i proporcjonalnie podziel składniki. Nie zwiększaj proporcjonalnie temperatur.';} return language === 'tr' ? tr : ((window.NP_L10N || {})[language] || {})[tr] || en || tr; },
 normalize: function(value){ return String(value || '').replace(/İ/g,'i').replace(/ı/g,'i').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
};
