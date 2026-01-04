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

    // 1. جلب وعرض الإعلانات النشطة
    await fetchAndDisplayAds();

    // 2. جلب وعرض تصنيفات التطبيقات
    await fetchAndDisplayAppTags();
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
    // جلب جميع التطبيقات التي لها تصنيفات
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

    // تجميع التصنيفات حسب التطبيق
    const tagsByApp = {};
    appTags.forEach(item => {
        if (!tagsByApp[item.app_id]) {
            tagsByApp[item.app_id] = [];
        }
        if (item.tags) {
            tagsByApp[item.app_id].push(item.tags);
        }
    });

    // تحديث الواجهة
    Object.keys(tagsByApp).forEach(appId => {
        const card = document.querySelector(`.app-card[data-appid="${appId}"]`);
        if (card) {
            const body = card.querySelector('.app-card-body');
            if (body) {
                // إضافة التصنيفات الجديدة بجانب القديمة (بدون حذف القديم)
                tagsByApp[appId].forEach(tag => {
                    // التحقق من عدم وجود التاق مسبقاً لتجنب التكرار عند إعادة التشغيل
                    // لكن بما أننا لا نحذف، سنفترض أن هذا الكود يعمل مرة واحدة عند التحميل
                    const span = document.createElement('span');
                    // استخدام كلاسات Tailwind المخزنة أو الافتراضية
                    // ملاحظة: يجب أن تكون الألوان آمنة (safelist) في Tailwind وإلا قد لا تظهر إذا لم تكن مستخدمة مسبقاً
                    // سنستخدم style للون الخلفية والنص كاحتياط إذا كان اللون مخصصاً، أو نعتمد على الكلاس
                    span.className = `inline-block ${tag.color} text-white text-sm font-medium px-3 py-1 rounded-full ml-1 mb-1`;
                    span.textContent = tag.name;
                    body.appendChild(span);
                });
            }
        }
    });
}
