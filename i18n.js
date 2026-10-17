/* Six interface languages; untranslated recipe instructions remain Turkish. */
window.NP_I18N = {
 choose: function(language,tr,en){ return language === 'tr' ? tr : ((window.NP_L10N || {})[language] || {})[tr] || en || tr; },
 normalize: function(value){ return String(value || '').replace(/İ/g,'i').replace(/ı/g,'i').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
};
