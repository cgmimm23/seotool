export function buildAgentScript(siteId: string, apiBaseUrl: string): string {
  return `(function(){
  if(window.__seoAgentRan)return;window.__seoAgentRan=true;
  var S='${siteId}',API='${apiBaseUrl}';
  var issues=[],fixes=[];

  function ready(fn){document.readyState!=='loading'?setTimeout(fn,100):document.addEventListener('DOMContentLoaded',fn)}
  function q(s){return document.querySelector(s)}
  function qa(s){return document.querySelectorAll(s)}
  function addMeta(name,content){var m=document.createElement('meta');m.setAttribute('name',name);m.setAttribute('content',content);document.head.appendChild(m);return m}
  function addProp(prop,content){var m=document.createElement('meta');m.setAttribute('property',prop);m.setAttribute('content',content);document.head.appendChild(m);return m}
  function addLink(rel,href){var l=document.createElement('link');l.setAttribute('rel',rel);l.setAttribute('href',href);document.head.appendChild(l);return l}
  function getPageText(){var el=q('main')||q('article')||q('body');if(!el)return'';var t=el.innerText||el.textContent||'';return t.replace(/\\s+/g,' ').trim()}
  function truncate(s,n){if(s.length<=n)return s;var t=s.substring(0,n);return t.substring(0,t.lastIndexOf(' '))+'...'}

  ready(function(){try{
    var title=document.title||'';
    var pageText=getPageText();
    var desc=truncate(pageText,155);
    var url=location.href.split('?')[0].split('#')[0];

    // 1. Meta description
    if(!q('meta[name="description"]')&&desc){
      addMeta('description',desc);
      issues.push({type:'missing_meta_description',detail:'No meta description found'});
      fixes.push({type:'injected_meta_description',value:desc});
    }

    // 2. Canonical URL
    if(!q('link[rel="canonical"]')){
      addLink('canonical',url);
      issues.push({type:'missing_canonical',detail:'No canonical URL'});
      fixes.push({type:'injected_canonical',value:url});
    }

    // 3. Viewport
    if(!q('meta[name="viewport"]')){
      addMeta('viewport','width=device-width, initial-scale=1');
      issues.push({type:'missing_viewport',detail:'No viewport meta tag'});
      fixes.push({type:'injected_viewport',value:'width=device-width, initial-scale=1'});
    }

    // 4. Open Graph
    var ogTags=[
      {p:'og:title',v:title},
      {p:'og:description',v:desc},
      {p:'og:url',v:url},
      {p:'og:type',v:'website'}
    ];
    ogTags.forEach(function(og){
      if(!q('meta[property="'+og.p+'"]')&&og.v){
        addProp(og.p,og.v);
        issues.push({type:'missing_og_'+og.p.replace('og:',''),detail:'Missing '+og.p});
        fixes.push({type:'injected_og_'+og.p.replace('og:',''),value:og.v});
      }
    });

    // 5. JSON-LD Schema
    if(!q('script[type="application/ld+json"]')){
      var schema={
        '@context':'https://schema.org',
        '@type':'WebPage',
        name:title,
        description:desc,
        url:url
      };
      var sc=document.createElement('script');
      sc.type='application/ld+json';
      sc.textContent=JSON.stringify(schema);
      document.head.appendChild(sc);
      issues.push({type:'missing_schema',detail:'No JSON-LD structured data'});
      fixes.push({type:'injected_schema',value:'WebPage schema'});
    }

    // 6. Heading hierarchy check (report only, no auto-fix)
    var h1s=qa('h1');
    if(h1s.length===0){
      issues.push({type:'missing_h1',detail:'No H1 tag found'});
    }else if(h1s.length>1){
      issues.push({type:'multiple_h1',detail:h1s.length+' H1 tags found (should be 1)'});
    }

    // 7. Images missing alt text — collect and send to AI
    var missingAlt=[];
    qa('img').forEach(function(img){
      if(!img.getAttribute('alt')&&!img.getAttribute('data-alt')){
        var src=img.getAttribute('src')||'';
        if(src&&!src.startsWith('data:')){
          missingAlt.push({src:src,context:title});
          issues.push({type:'missing_alt',element:'img[src="'+src.substring(0,100)+'"]',detail:'Image missing alt text'});
        }
      }
    });

    // Send images for AI alt text
    if(missingAlt.length>0){
      var batch=missingAlt.slice(0,10);
      fetch(API+'/api/agent/alt-text',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({siteId:S,images:batch}),
        keepalive:true
      }).then(function(r){return r.json()}).then(function(data){
        if(data.results){
          data.results.forEach(function(r){
            var imgs=qa('img[src="'+r.src+'"]');
            imgs.forEach(function(img){
              img.setAttribute('alt',r.alt);
            });
            fixes.push({type:'injected_alt',element:'img[src="'+r.src.substring(0,100)+'"]',value:r.alt});
          });
        }
        sendReport(title);
      }).catch(function(){sendReport(title)});
    }else{
      sendReport(title);
    }

    function sendReport(t){
      var snapshot={
        title:t,
        hasMetaDesc:!!q('meta[name="description"]'),
        hasCanonical:!!q('link[rel="canonical"]'),
        hasOg:!!q('meta[property="og:title"]'),
        hasSchema:!!q('script[type="application/ld+json"]'),
        h1Count:qa('h1').length,
        imgCount:qa('img').length,
        imgNoAlt:qa('img:not([alt])').length
      };
      fetch(API+'/api/agent/report',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({siteId:S,pageUrl:url,pageTitle:t,issuesFound:issues,fixesApplied:fixes,metaSnapshot:snapshot,userAgent:navigator.userAgent}),
        keepalive:true
      }).catch(function(){});
    }
  }catch(e){}});
})();`
}
