/**
 * admin_manager.js
 * هذا الملف مسؤول عن إدارة لوحة تحكم الأدمن.
 * يتم تحميله في index.html ولكنه لا يعمل إلا إذا كان المستخدم "أدمن".
 */

// التأكد من تحميل الصفحة بالكامل قبل البدء
document.addEventListener('DOMContentLoaded', async () => {
    // ننتظر قليلاً حتى يتم تهيئة Supabase في الملف الرئيسي
    setTimeout(initAdminPanel, 1000);
});

async function initAdminPanel() {
    if (typeof supabase === 'undefined') {
        console.warn('Supabase client not found yet.');
        return;
    }

    // 1. التحقق من هوية المستخدم
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return; // ليس مسجلاً

    // 2. التحقق من الصلاحية (Role) من جدول profiles
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (error || !profile || profile.role !== 'admin') {
        return; // ليس أدمن
    }

    console.log('Admin detected. Initializing Admin Panel...');

    // 3. حقن واجهة الأدمن (زر + مودال)
    injectAdminUI();

    // 4. تهيئة الأحداث
    setupAdminEventListeners();
}

function injectAdminUI() {
    // زر فتح اللوحة العائم
    const adminBtn = document.createElement('button');
    adminBtn.id = 'btn-open-admin';
    adminBtn.className = 'fixed bottom-24 left-6 z-50 p-3 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-transform hover:scale-110';
    adminBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    `;
    adminBtn.title = "لوحة تحكم المدير";
    document.body.appendChild(adminBtn);

    // المودال (النافذة المنبثقة)
    const modalHTML = `
    <div id="admin-modal" class="fixed inset-0 z-[100] hidden" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <!-- الخلفية المعتمة -->
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm" id="admin-overlay"></div>

        <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                
                <div class="relative transform overflow-hidden rounded-lg bg-white dark:bg-zinc-900 text-right shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl border border-zinc-200 dark:border-zinc-700">
                    
                    <!-- الهيدر -->
                    <div class="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 sm:px-6 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-700">
                        <h3 class="text-lg font-bold leading-6 text-zinc-900 dark:text-zinc-100" id="modal-title">لوحة التحكم</h3>
                        <button id="btn-close-admin" class="text-zinc-400 hover:text-zinc-500 focus:outline-none">
                            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <!-- المحتوى -->
                    <div class="px-4 py-4 sm:p-6">
                        
                        <!-- التبويبات -->
                        <div class="border-b border-zinc-200 dark:border-zinc-700 mb-4">
                            <nav class="-mb-px flex space-x-8 space-x-reverse" aria-label="Tabs">
                                <button id="tab-ads" class="admin-tab border-indigo-500 text-indigo-600 dark:text-indigo-400 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium">الإعلانات</button>
                                <button id="tab-tags" class="admin-tab border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium">التصنيفات</button>
                                <button id="tab-app-tags" class="admin-tab border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium">ربط التصنيفات</button>
                            </nav>
                        </div>

                        <!-- محتوى تبويب الإعلانات -->
                        <div id="content-ads" class="admin-content block">
                            <div class="flex justify-between mb-4">
                                <h4 class="text-md font-semibold dark:text-white">قائمة الإعلانات</h4>
                                <button id="btn-add-ad" class="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-sm">إضافة إعلان</button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                                    <thead class="bg-zinc-50 dark:bg-zinc-800">
                                        <tr>
                                            <th class="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">الصورة</th>
                                            <th class="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">العنوان</th>
                                            <th class="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">الحالة</th>
                                            <th class="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody id="ads-table-body" class="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                                        <!-- سيتم تعبئة البيانات هنا بالجافاسكربت -->
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- محتوى تبويب التصنيفات -->
                        <div id="content-tags" class="admin-content hidden">
                            <div class="flex justify-between mb-4">
                                <h4 class="text-md font-semibold dark:text-white">قائمة التصنيفات</h4>
                                <button id="btn-add-tag" class="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-sm">إضافة تصنيف</button>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                                    <thead class="bg-zinc-50 dark:bg-zinc-800">
                                        <tr>
                                            <th class="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">الاسم</th>
                                            <th class="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">اللون (Tailwind)</th>
                                            <th class="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody id="tags-table-body" class="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                                    </tbody>
                                </table>
                            </div>
                        </div>

                         <!-- محتوى تبويب ربط التصنيفات -->
                         <div id="content-app-tags" class="admin-content hidden">
                            <div class="mb-4">
                                <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">اختر التطبيق</label>
                                <select id="select-app-for-tags" class="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-600 dark:text-white sm:text-sm p-2">
                                    <option value="game-thinkwin">فكر تربح</option>
                                    <option value="game-mileon">من سيربح المليون</option>
                                    <option value="game-seawar">حرب البحار</option>
                                    <option value="game-captain">خزنة ربان</option>
                                    <option value="game-malkoof">الملقوف</option>
                                    <option value="game-mafia">مافيا</option>
                                    <option value="4to-won">أربعة تربح</option>
                                    <option value="game-topten">توب تن</option>
                                    <option value="tool-remote">جهاز التحكم</option>
                                    <option value="tool-sodfa">صدفة</option>
                                    <option value="tool-questions">بنك الأسئلة</option>
                                    <option value="tool-letters">حروف</option>
                                </select>
                            </div>
                            <div id="app-tags-container" class="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <!-- سيتم عرض التصنيفات كـ Checkboxes هنا -->
                            </div>
                            <div class="mt-4 text-right">
                                <button id="btn-save-app-tags" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">حفظ التغييرات</button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    // إضافة المودال للصفحة
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
}

function setupAdminEventListeners() {
    const btnOpen = document.getElementById('btn-open-admin');
    const btnClose = document.getElementById('btn-close-admin');
    const modal = document.getElementById('admin-modal');
    const overlay = document.getElementById('admin-overlay');

    // فتح/إغلاق المودال
    btnOpen.onclick = () => {
        modal.classList.remove('hidden');
        loadAdsData(); // تحميل البيانات عند الفتح
    };
    
    const closeModal = () => modal.classList.add('hidden');
    btnClose.onclick = closeModal;
    overlay.onclick = closeModal;

    // التبويبات
    const tabs = {
        'tab-ads': 'content-ads',
        'tab-tags': 'content-tags',
        'tab-app-tags': 'content-app-tags'
    };

    Object.keys(tabs).forEach(tabId => {
        document.getElementById(tabId).onclick = (e) => {
            // تفعيل التبويب الحالي وإلغاء الآخرين
            document.querySelectorAll('.admin-tab').forEach(t => {
                t.classList.remove('border-indigo-500', 'text-indigo-600', 'dark:text-indigo-400');
                t.classList.add('border-transparent', 'text-zinc-500');
            });
            e.target.classList.remove('border-transparent', 'text-zinc-500');
            e.target.classList.add('border-indigo-500', 'text-indigo-600', 'dark:text-indigo-400');

            // إظهار المحتوى وإخفاء الآخرين
            document.querySelectorAll('.admin-content').forEach(c => c.classList.add('hidden'));
            document.getElementById(tabs[tabId]).classList.remove('hidden');

            // تحميل البيانات الخاصة بالتبويب
            if (tabId === 'tab-ads') loadAdsData();
            if (tabId === 'tab-tags') loadTagsData();
            if (tabId === 'tab-app-tags') loadAppTagsData();
        };
    });

    // أزرار الإضافة
    document.getElementById('btn-add-ad').onclick = async () => {
        const title = prompt('عنوان الإعلان:');
        const imageUrl = prompt('رابط الصورة:');
        const linkUrl = prompt('رابط التوجيه (اختياري):');
        const frequencyInput = prompt('تكرار الظهور:\nاكتب "always" للظهور الدائم\nأو "once" للظهور مرة واحدة فقط', 'once');
        
        // التحقق من القيمة المدخلة أو استخدام الافتراضي
        let frequency = 'once';
        if (frequencyInput && frequencyInput.toLowerCase().includes('always')) {
            frequency = 'always';
        }

        if (title && imageUrl) {
            const { error } = await supabase.from('ads').insert([{ 
                title, 
                image_url: imageUrl, 
                link_url: linkUrl,
                frequency: frequency
            }]);
            if (!error) loadAdsData(); else alert('خطأ: ' + error.message);
        }
    };

    document.getElementById('btn-add-tag').onclick = async () => {
        const name = prompt('اسم التصنيف:');
        const color = prompt('لون التصنيف (مثال: bg-red-500):', 'bg-blue-500');
        
        if (name && color) {
            const { error } = await supabase.from('tags').insert([{ name, color }]);
            if (!error) loadTagsData(); else alert('خطأ: ' + error.message);
        }
    };

    // تغيير التطبيق في تبويب ربط التصنيفات
    document.getElementById('select-app-for-tags').onchange = loadAppTagsData;
    
    // حفظ ربط التصنيفات
    document.getElementById('btn-save-app-tags').onclick = saveAppTags;
}

// === دوال تحميل البيانات ===

async function loadAdsData() {
    const tbody = document.getElementById('ads-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">جاري التحميل...</td></tr>';

    const { data: ads, error } = await supabase.from('ads').select('*').order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-red-500 py-4">${error.message}</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    ads.forEach(ad => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-zinc-50 dark:hover:bg-zinc-800';
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm"><img src="${ad.image_url}" class="h-10 w-10 rounded object-cover"></td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">
                ${ad.title || '-'}<br>
                <span class="text-xs text-gray-500">التكرار: ${ad.frequency === 'always' ? 'دائماً' : 'مرة واحدة'}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ad.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${ad.is_active ? 'نشط' : 'غير نشط'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="toggleAdStatus('${ad.id}', ${!ad.is_active})" class="text-indigo-600 hover:text-indigo-900 ml-2">${ad.is_active ? 'تعطيل' : 'تفعيل'}</button>
                <button onclick="editAd('${ad.id}', '${ad.title || ''}', '${ad.image_url}', '${ad.frequency || 'once'}')" class="text-blue-600 hover:text-blue-900 ml-2">تعديل</button>
                <button onclick="deleteAd('${ad.id}')" class="text-red-600 hover:text-red-900">حذف</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadTagsData() {
    const tbody = document.getElementById('tags-table-body');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4">جاري التحميل...</td></tr>';

    const { data: tags, error } = await supabase.from('tags').select('*').order('created_at', { ascending: false });

    if (error) return;

    tbody.innerHTML = '';
    tags.forEach(tag => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-zinc-50 dark:hover:bg-zinc-800';
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">${tag.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                <span class="${tag.color} text-white px-2 py-1 rounded text-xs">${tag.color}</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="deleteTag('${tag.id}')" class="text-red-600 hover:text-red-900 ml-2">حذف</button>
                <button onclick="editTag('${tag.id}', '${tag.name}', '${tag.color}')" class="text-blue-600 hover:text-blue-900">تعديل</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadAppTagsData() {
    const appId = document.getElementById('select-app-for-tags').value;
    const container = document.getElementById('app-tags-container');
    container.innerHTML = 'جاري التحميل...';

    // جلب كل التاقات
    const { data: allTags } = await supabase.from('tags').select('*');
    // جلب التاقات المرتبطة بهذا التطبيق
    const { data: appTags } = await supabase.from('app_tags').select('tag_id').eq('app_id', appId);
    
    const associatedTagIds = new Set(appTags?.map(item => item.tag_id));

    container.innerHTML = '';
    allTags.forEach(tag => {
        const isChecked = associatedTagIds.has(tag.id) ? 'checked' : '';
        const div = document.createElement('div');
        div.className = 'flex items-center space-x-2 space-x-reverse bg-zinc-50 dark:bg-zinc-800 p-2 rounded border border-zinc-200 dark:border-zinc-700';
        div.innerHTML = `
            <input type="checkbox" id="tag-${tag.id}" value="${tag.id}" class="app-tag-checkbox h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" ${isChecked}>
            <label for="tag-${tag.id}" class="text-sm font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer select-none flex-1">
                ${tag.name} 
                <span class="${tag.color} w-3 h-3 inline-block rounded-full mr-1"></span>
            </label>
        `;
        container.appendChild(div);
    });
}

async function saveAppTags() {
    const appId = document.getElementById('select-app-for-tags').value;
    const checkboxes = document.querySelectorAll('.app-tag-checkbox:checked');
    const selectedTagIds = Array.from(checkboxes).map(cb => cb.value);
    const btn = document.getElementById('btn-save-app-tags');

    btn.textContent = 'جاري الحفظ...';
    btn.disabled = true;

    // 1. حذف العلاقات القديمة
    await supabase.from('app_tags').delete().eq('app_id', appId);

    // 2. إضافة العلاقات الجديدة
    if (selectedTagIds.length > 0) {
        const insertData = selectedTagIds.map(tagId => ({ app_id: appId, tag_id: tagId }));
        await supabase.from('app_tags').insert(insertData);
    }

    btn.textContent = 'تم الحفظ بنجاح!';
    setTimeout(() => {
        btn.textContent = 'حفظ التغييرات';
        btn.disabled = false;
    }, 2000);
}

// === دوال مساعدة (Global Scope) ===
window.toggleAdStatus = async (id, newStatus) => {
    await supabase.from('ads').update({ is_active: newStatus }).eq('id', id);
    loadAdsData();
};

window.deleteAd = async (id) => {
    if (confirm('هل أنت متأكد من حذف هذا الإعلان؟')) {
        await supabase.from('ads').delete().eq('id', id);
        loadAdsData();
    }
};

window.editAd = async (id, oldTitle, oldImage, oldFrequency) => {
    const title = prompt('عنوان الإعلان الجديد:', oldTitle);
    const imageUrl = prompt('رابط الصورة الجديد:', oldImage);
    const frequencyInput = prompt('تكرار الظهور الجديد (always/once):', oldFrequency);
    
    let frequency = 'once';
    if (frequencyInput && frequencyInput.toLowerCase().includes('always')) {
        frequency = 'always';
    }

    if (title && imageUrl) {
        const { error } = await supabase.from('ads').update({ 
            title, 
            image_url: imageUrl,
            frequency: frequency
        }).eq('id', id);
        if (!error) loadAdsData(); else alert('خطأ: ' + error.message);
    }
};

window.deleteTag = async (id) => {
    if (confirm('هل أنت متأكد؟ سيتم إزالته من جميع التطبيقات المرتبطة.')) {
        await supabase.from('tags').delete().eq('id', id);
        loadTagsData();
    }
};

window.editTag = async (id, oldName, oldColor) => {
    const name = prompt('اسم التصنيف الجديد:', oldName);
    const color = prompt('لون التصنيف الجديد (Tailwind):', oldColor);
    
    if (name && color) {
        const { error } = await supabase.from('tags').update({ name, color }).eq('id', id);
        if (!error) loadTagsData(); else alert('خطأ: ' + error.message);
    }
};
