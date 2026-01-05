/**
 * dynamic_content.js
 * هذا الملف مسؤول عن جلب المحتوى المتغير (الإعلانات والتصنيفات) من Supabase
 * وعرضه لجميع المستخدمين (سواء أدمن أو زائر عادي).
 */

document.addEventListener('DOMContentLoaded', async () => {
    // ننتظر قليلاً حتى يتم تهيئة Supabase
    setTimeout(initDynamicContent, 1000);
});

async function initDynamicContent() {
    if (typeof supabase === 'undefined') return;

    // (تعديل) تم إزالة الاستدعاء التلقائي للإعلانات لتظهر فقط عند الدخول للقائمة الرئيسية
    // await fetchAndDisplayAds(); 
    
    await fetchAndDisplayAppTags();
    await fetchAndDisplayUpdatesList();
}

/**
 * جلب الإعلان النشط وعرضه في النافذة المنبثقة
 */
async function fetchAndDisplayAds() {
    // جلب أحدث إعلان نشط
    const { data: ads, error } = await supabase
        .from('ads')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !ads || ads.length === 0) return;

    const ad = ads[0];
    const modal = document.getElementById('announcement-modal');
    const imgElement = document.getElementById('announcement-image');
    
    if (imgElement) {
        imgElement.src = ad.image_url;
        
        // إذا كان هناك رابط، نجعل الصورة قابلة للنقر
        if (ad.link_url) {
            imgElement.style.cursor = 'pointer';
            imgElement.onclick = () => {
                window.open(ad.link_url, '_blank');
            };
        }
        
        // منطق التكرار (Frequency)
        // إذا كان always: يظهر دائماً (لا نتحقق من التخزين)
        // إذا كان once: نتحقق من localStorage (ليظهر مرة واحدة فقط في الحياة)
        
        let shouldShow = false;

        if (ad.frequency === 'always') {
            shouldShow = true;
        } else {
            // الافتراضي هو once
            const hasSeenAd = localStorage.getItem('seen_ad_' + ad.id);
            if (!hasSeenAd) {
                shouldShow = true;
                // نسجل المشاهدة في LocalStorage (دائم) بدلاً من SessionStorage
                localStorage.setItem('seen_ad_' + ad.id, 'true');
            }
        }

        if (shouldShow) {
             // نحاكي دالة showAnnouncement الموجودة في الملف الأصلي
             // أو نظهره مباشرة
             if (modal) {
                 modal.style.display = 'flex';
                 // إضافة الأنيميشن
                 setTimeout(() => {
                     const box = document.getElementById('announcement-modal-box');
                     if(box) {
                         box.classList.remove('scale-95', 'opacity-0');
                         box.classList.add('scale-100', 'opacity-100');
                     }
                 }, 10);
             }
        }
    }
}

/**
 * جلب التصنيفات لكل تطبيق وتحديث البطاقات
 */
async function fetchAndDisplayAppTags() {
    const { data: appTags, error } = await supabase
        .from('app_tags')
        .select(`
            app_id,
            tags (
                name,
                color
            )
        `);

    if (error || !appTags) return;

    const tagsByApp = {};
    appTags.forEach(item => {
        if (!tagsByApp[item.app_id]) {
            tagsByApp[item.app_id] = [];
        }
        if (item.tags) {
            tagsByApp[item.app_id].push(item.tags);
        }
    });

    Object.keys(tagsByApp).forEach(appId => {
        const card = document.querySelector(`.app-card[data-appid="${appId}"]`);
        if (card) {
            const body = card.querySelector('.app-card-body');
            if (body) {
                // بناء HTML للتصنيفات باستخدام منطق المستخدم المحسن
                const tagsHTML = tagsByApp[appId].map(tag => {
                    // 1. التحقق هل اللون كود (Hex) أم كلاس (Tailwind)
                    const isHexColor = tag.color && tag.color.startsWith('#');
                    
                    // 2. إذا كان كود، نضعه في style، وإلا نضعه في class
                    const styleAttr = isHexColor ? `background-color: ${tag.color};` : '';
                    const colorClass = isHexColor ? '' : tag.color; // إذا كان hex لا نضع كلاس لون

                    // 3. تحسين: جعل النص أسود إذا كانت الخلفية فاتحة
                    let textColorClass = 'text-white';
                    if (isHexColor) {
                        // حساب السطوع لتقرر هل النص يكون أبيض أم أسود
                        const hex = tag.color.replace('#', '');
                        // التعامل مع أكواد الألوان المختصرة (3 أرقام)
                        const fullHex = hex.length === 3 ? hex.split('').map(x => x + x).join('') : hex;
                        
                        const r = parseInt(fullHex.substr(0, 2), 16);
                        const g = parseInt(fullHex.substr(2, 2), 16);
                        const b = parseInt(fullHex.substr(4, 2), 16);
                        
                        // معادلة السطوع القياسية
                        const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                        
                        // إذا السطوع عالي (لون فاتح) اجعل النص أسود
                        if (brightness > 155) textColorClass = 'text-gray-800';
                    }

                    return `
                        <span class="${colorClass} ${textColorClass} inline-block px-2 py-1 rounded-md text-xs font-bold shadow-sm border border-black/5 ml-1 mb-1" 
                              style="${styleAttr}">
                            ${tag.name}
                        </span>
                    `;
                }).join('');
                
                // إضافة التصنيفات إلى جسم البطاقة
                body.insertAdjacentHTML('beforeend', tagsHTML);
            }
        }
    });
}

async function fetchAndDisplayUpdatesList() {
    const tbody = document.getElementById('updates-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-sm text-zinc-500 dark:text-zinc-300">جاري تحميل التحديثات...</td></tr>';

    const { data: updates, error } = await supabase
        .from('updates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-sm text-red-600 dark:text-red-400">${error.message}</td></tr>`;
        return;
    }

    if (!updates || updates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-sm text-zinc-500 dark:text-zinc-300">لا توجد تحديثات مسجلة حالياً.</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    updates.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-zinc-900 dark:text-zinc-100">
                ${item.version || index + 1}
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">
                ${item.date_text || ''}
            </td>
            <td class="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-300 whitespace-normal">
                ${item.description || ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}
