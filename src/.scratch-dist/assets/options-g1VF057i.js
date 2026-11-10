import{g as y,u as n,i as w,s as f}from"./validation-DXYtbo6I.js";async function I(){const l=await y(),h=document.getElementById("options-root");if(!h)return;h.innerHTML=`
  <nav class="tabs" aria-label="Settings navigation">
    <ul>
      <li><a href="#general" class="tab active">General</a></li>
      <li><a href="#search" class="tab">Search</a></li>
      <li><a href="#wallpaper" class="tab">Wallpaper</a></li>
      <li><a href="#widgets" class="tab">Widgets</a></li>
      <li><a href="#advanced" class="tab">Advanced</a></li>
    </ul>
  </nav>

  <section id="general" class="panel active">
    <h2>General</h2>
    <label for="theme-select">Theme:</label>
    <select id="theme-select">
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>

    <label for="shortcut-layout-select">Shortcut Layout:</label>
    <select id="shortcut-layout-select">
      <option value="grid">Grid</option>
      <option value="list">List</option>
    </select>

    <label for="bar-position-select">Search Bar Position:</label>
    <select id="bar-position-select">
      <option value="top">Top</option>
      <option value="center">Center</option>
      <option value="bottom">Bottom</option>
    </select>

    <button id="reset-btn" class="btn btn-solid">Reset to Defaults</button>
  </section>

  <section id="search" class="panel">
    <h2>Search Provider</h2>
    <label for="search-provider-select">Search Provider:</label>
    <select id="search-provider-select">
      <option value="duckduckgo">DuckDuckGo</option>
      <option value="google">Google</option>
      <option value="bing">Bing</option>
      <option value="brave">Brave Search</option>
      <option value="startpage">Startpage</option>
      <option value="custom">Custom</option>
    </select>

    <section id="custom-url-section" style="display:none;">
      <label for="custom-url-input">Custom Search URL (must include %s where query will be inserted):</label>
      <input type="text" id="custom-url-input" placeholder="https://example.com/search?q=%s" />
    </section>
  </section>

  <section id="wallpaper" class="panel">
    <h2>Wallpaper</h2>
    <label for="wallpaper-input">Custom Wallpaper (image file):</label>
    <input type="file" id="wallpaper-input" accept="image/*" />

    <label for="remote-wallpaper-input">Remote Wallpaper URL (image or video):</label>
    <input type="text" id="remote-wallpaper-input" placeholder="https://example.com/wallpaper.jpg" />
    <button id="apply-remote-wallpaper-btn" class="btn btn-solid">Apply Remote Wallpaper</button>
    <button id="open-opera-wallpapers-btn" class="btn btn-solid">Open Opera Wallpapers</button>
  </section>

  <section id="widgets" class="panel">
    <h2>Widgets & Layout</h2>
    <p>Drag widgets on the New Tab page to reorder; resize using handles – changes persist instantly.</p>
  </section>

  <section id="advanced" class="panel">
    <h2>Advanced</h2>
    <button id="export-btn" class="btn btn-solid">Export Settings</button>
    <button id="import-btn" class="btn btn-solid">Import Settings</button>
    <input type="file" id="import-file" accept="application/json" style="display:none;" />
    <button id="customize-tabs-btn" class="btn btn-solid">Customize Layout</button>
  </section>

`;const i=document.getElementById("theme-select");i.value=l.theme??"system";const r=document.getElementById("search-provider-select");r.value=l.searchProvider??"duckduckgo";const c=document.getElementById("custom-url-section"),p=document.getElementById("custom-url-input");l.searchProvider==="custom"&&(c.style.display="",p.value=l.customSearchUrl??"");const d=document.getElementById("shortcut-layout-select");d.value=l.shortcutLayout??"grid";const u=document.getElementById("bar-position-select");u.value=l.barPosition??"center",i.addEventListener("change",()=>{n({theme:i.value})}),r.addEventListener("change",()=>{const e=r.value;n({searchProvider:e}),e==="custom"?c.style.display="":c.style.display="none"}),p.addEventListener("blur",()=>{const e=p.value.trim();e&&!w(e)?alert("Invalid custom URL"):n({customSearchUrl:e||void 0})}),d.addEventListener("change",()=>{n({shortcutLayout:d.value})}),u.addEventListener("change",()=>{n({barPosition:u.value})});const g=document.getElementById("wallpaper-input");g.addEventListener("change",()=>{var o;const e=(o=g.files)==null?void 0:o[0];if(!e)return;const a=new FileReader;a.onload=async()=>{const t=a.result;await n({wallpaper:t}),alert("Wallpaper updated. Reload New Tab to see it.")},a.readAsDataURL(e)});const L=document.getElementById("remote-wallpaper-input"),E=document.getElementById("apply-remote-wallpaper-btn"),B=document.getElementById("open-opera-wallpapers-btn");E.addEventListener("click",async()=>{const e=L.value.trim();if(!e){alert("Please enter a wallpaper URL.");return}if(!w(e)){alert("Invalid URL.");return}try{const a=await fetch(e);if(!a.ok)throw new Error("Network response was not ok");const o=await a.blob(),t=new FileReader;t.onload=async()=>{const s=t.result;await n({wallpaper:s}),alert("Remote wallpaper applied. Reload New Tab to see it.")},t.readAsDataURL(o)}catch(a){console.error(a),alert("Failed to fetch or apply wallpaper.")}}),B.addEventListener("click",()=>{window.open("https://addons.opera.com/en/wallpapers/","_blank")}),document.getElementById("export-btn").addEventListener("click",async()=>{const e=await y(),a=new Blob([JSON.stringify(e,null,2)],{type:"application/json"}),o=URL.createObjectURL(a),t=document.createElement("a");t.href=o,t.download="cyberbrowse-settings.json",t.click(),URL.revokeObjectURL(o)});const S=document.getElementById("import-btn"),m=document.getElementById("import-file");S.addEventListener("click",()=>m.click()),m.addEventListener("change",async()=>{var a;const e=(a=m.files)==null?void 0:a[0];if(e)try{const o=await e.text(),t=JSON.parse(o);if(!t.theme||!t.searchProvider){alert("Invalid settings file.");return}await f(t),alert("Settings imported. Reload New Tab to apply.")}catch(o){console.error(o),alert("Failed to import settings.")}}),document.getElementById("customize-tabs-btn").addEventListener("click",()=>{const e=chrome.runtime.getURL("newtab/newtab.html?customize=1");window.open(e,"_blank")}),document.getElementById("reset-btn").addEventListener("click",async()=>{confirm("Reset all settings to defaults?")&&(await f({theme:"system",searchProvider:"duckduckgo",shortcuts:[],widgets:[],layout:"simple",wallpaper:void 0,barPosition:"center",shortcutLayout:"grid"}),alert("Settings reset. Reload New Tab to see defaults."))});const v=document.querySelectorAll(".tab"),k=document.querySelectorAll(".panel");v.forEach(e=>{e.addEventListener("click",a=>{var s;a.preventDefault();const o=(s=e.getAttribute("href"))==null?void 0:s.substring(1);if(!o)return;v.forEach(b=>b.classList.remove("active")),k.forEach(b=>b.classList.remove("active")),e.classList.add("active");const t=document.getElementById(o);t&&t.classList.add("active")})})}document.addEventListener("DOMContentLoaded",I);
