/* Text-first interface: remove pictograms from dynamically generated controls. */
(() => {
 'use strict';
 const iconPattern=/[\p{Extended_Pictographic}\uFE0F\u200D]/gu;
 function cleanText(node){
  if(!node||node.nodeType!==Node.TEXT_NODE||!node.nodeValue)return;
  const next=node.nodeValue.replace(iconPattern,'').replace(/[ \t]{2,}/g,' ');
  if(next!==node.nodeValue)node.nodeValue=next;
 }
 function cleanTree(root){
  if(!root)return;
  if(root.nodeType===Node.TEXT_NODE){cleanText(root);return;}
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  while(walker.nextNode())cleanText(walker.currentNode);
 }
 function cleanSpecial(){
  const crest=document.querySelector('.crest');if(crest&&crest.textContent.trim()!=='Э')crest.textContent='Э';
  const avatar=document.querySelector('.avatar');if(avatar&&avatar.textContent.trim()!=='А')avatar.textContent='А';
  const eventMark=document.querySelector('#eventIcon');if(eventMark&&/[\p{Extended_Pictographic}]/u.test(eventMark.textContent))eventMark.textContent='СОБЫТИЕ';
 }
 cleanTree(document.body);cleanSpecial();
 new MutationObserver(records=>{
  records.forEach(record=>{
   if(record.type==='characterData')cleanText(record.target);
   record.addedNodes?.forEach(cleanTree);
  });
  cleanSpecial();
 }).observe(document.body,{subtree:true,childList:true,characterData:true});
})();
