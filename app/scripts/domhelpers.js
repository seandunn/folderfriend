/* @flow */

export function hasClass(el:Object, className:string): boolean {
  return [].indexOf.call(el.classList, className) >= 0;
}

export function replaceClass(el:Object, className:string, replacementClass:string){
  var re = new RegExp("\\b"+className);
  el.className = el.className.replace(re, (" "+replacementClass) || "");
}

