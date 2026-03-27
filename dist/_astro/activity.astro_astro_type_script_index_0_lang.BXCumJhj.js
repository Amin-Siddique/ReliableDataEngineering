function T(){const u=document.getElementById("activity-auth-prompt"),g=document.getElementById("activity-loading"),r=document.getElementById("activity-content");if(!u||!g||!r)return;function n(e){const i=document.createElement("div");return i.textContent=e,i.innerHTML}function c(e){return`/posts/${e}/`}function d(e){return e.replace(/^article_/,"").replace(/\.md$/,"").replace(/_/g," ").replace(/\b\w/g,i=>i.toUpperCase())}function m(e){return new Date(e).toLocaleDateString("en-US",{month:"short",day:"numeric"})}function $(e){const i=Math.floor((Date.now()-new Date(e).getTime())/1e3);return i<60?"just now":i<3600?`${Math.floor(i/60)}m ago`:i<86400?`${Math.floor(i/3600)}h ago`:i<604800?`${Math.floor(i/86400)}d ago`:m(e)}const f=r.querySelectorAll(".activity-tab"),b=r.querySelectorAll(".activity-panel");f.forEach(e=>{e.addEventListener("click",()=>{f.forEach(a=>a.classList.remove("active")),b.forEach(a=>a.classList.add("hidden")),e.classList.add("active"),document.getElementById(`tab-${e.dataset.tab}`)?.classList.remove("hidden")})});function h(e){if(g?.classList.add("hidden"),!e){u?.classList.remove("hidden");return}r?.classList.remove("hidden");const i=e.avatarUrl||`https://ui-avatars.com/api/?name=${encodeURIComponent(e.displayName)}&background=3b82f6&color=fff&size=112`;document.getElementById("activity-avatar").src=i,document.getElementById("activity-name").textContent=e.displayName,document.getElementById("activity-email").textContent=e.email||"",Promise.all([fetch("/api/profile").then(a=>a.json()),fetch("/api/bookmarks").then(a=>a.json()),fetch("/api/reading-history").then(a=>a.json()),fetch("/api/notifications?limit=10").then(a=>a.json())]).then(([a,B,I,k])=>{const y=a.stats||{},v=B.bookmarks||[],p=I.history||[],w=k.notifications||[],C=k.unreadCount||0;document.getElementById("activity-stat-read").textContent=(y.articlesRead||0).toString(),document.getElementById("activity-stat-bookmarks").textContent=(y.bookmarks||0).toString(),document.getElementById("activity-stat-notifs").textContent=C.toString(),document.getElementById("activity-stat-comments").textContent=(y.comments||0).toString();const s=[];v.forEach(t=>{s.push({type:"bookmark",title:d(t.post_slug),href:c(t.post_slug),time:t.created_at,detail:"Bookmarked"})}),p.forEach(t=>{const o=Math.round(t.progress*100);s.push({type:"read",title:d(t.post_slug),href:c(t.post_slug),time:t.last_read_at,detail:o>=90?"Finished reading":`Read ${o}%`})}),w.forEach(t=>{s.push({type:"notif",title:t.message,href:t.post_slug?c(t.post_slug):"/notifications",time:t.created_at,detail:t.type==="reply"?"Reply":"Comment"})}),s.sort((t,o)=>new Date(o.time).getTime()-new Date(t.time).getTime());const E=document.getElementById("recent-list");s.length===0?E.innerHTML='<p class="activity-empty">No recent activity.</p>':E.innerHTML=s.slice(0,15).map(t=>{const o=t.type==="bookmark"?"type-bookmark":t.type==="read"?"type-read":"type-notif",l=t.type==="bookmark"?"&#128278;":t.type==="read"?"&#128214;":"&#128172;";return`
              <a href="${n(t.href)}" class="activity-item">
                <div class="activity-item-icon ${o}">${l}</div>
                <div class="activity-item-body">
                  <div class="activity-item-title">${n(t.title)}</div>
                  <div class="activity-item-meta">${n(t.detail||"")} &middot; ${$(t.time)}</div>
                </div>
              </a>
            `}).join("");const _=document.getElementById("bookmarks-list");v.length===0?_.innerHTML='<p class="activity-empty">No bookmarks yet. Save articles while reading.</p>':_.innerHTML=v.map(t=>`
            <a href="${n(c(t.post_slug))}" class="activity-item">
              <div class="activity-item-icon type-bookmark">&#128278;</div>
              <div class="activity-item-body">
                <div class="activity-item-title">${n(d(t.post_slug))}</div>
                <div class="activity-item-meta">Saved ${m(t.created_at)}</div>
              </div>
            </a>
          `).join("");const L=document.getElementById("history-list");p.length===0?L.innerHTML='<p class="activity-empty">No reading history yet.</p>':L.innerHTML=p.map(t=>{const o=Math.round(t.progress*100),l=o>=90;return`
              <a href="${n(c(t.post_slug))}" class="activity-item">
                <div class="activity-item-icon type-read">&#128214;</div>
                <div class="activity-item-body">
                  <div class="activity-item-title">${n(d(t.post_slug))}</div>
                  <div class="activity-item-meta">Last read ${m(t.last_read_at)}</div>
                </div>
                <span class="activity-item-badge ${l?"badge-done":"badge-progress"}">${l?"Done":o+"%"}</span>
              </a>
            `}).join("")}).catch(()=>{})}window.addEventListener("auth:ready",e=>h(e.detail)),window.__authUser!==void 0&&h(window.__authUser)}document.addEventListener("astro:page-load",T);
