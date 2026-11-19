// Tiny DOM helpers shared by everything else.
window.SM = window.SM || {};

window.SM.el = function el(tag, className, props) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (props) Object.assign(n, props);
  return n;
};