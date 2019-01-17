import getURLParameter from './geturlparams.js';

function computeHash(metric, selected, geography) {
  return `${metric}/${geography}/${selected.map(g => encodeURIComponent(g)).join(',')}`
}

function replaceState(metric, selected, geography) {
  location.hash = computeHash(metric,selected,geography);
}

function gaEvent(type, title, category) {
  if (ga) {
    ga('send', 'event', type, title, category);
  }
}

function urlArgsToHash() {
  let m = '';
  let s = '';
  let g = '';
  if (getURLParameter('m')) {
    m = getURLParameter('m');
  }
  if (getURLParameter('s')) {
    s = getURLParameter('s');
  }
  if (getURLParameter('g')) {
    g = getURLParameter('g');
  }
  if (m.length > 0 || s.length > 0) {
    history.replaceState(null, null, '.');
    replaceState(m, g, s.split(','));
  }
}

function getHash(pos = 0) {
  let hash = decodeURI(location.hash).split('/');
  if (hash[pos] && hash[pos].length > 0) {
    hash[pos] = hash[pos].toString().replace('#', '');
    return decodeURIComponent(hash[pos]);
  } else {
    return false;
  }
}

export {computeHash, replaceState, gaEvent, urlArgsToHash, getHash};
