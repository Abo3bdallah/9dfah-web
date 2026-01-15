/**
 * admin_manager.js
 * هذا الملف مسؤول عن إدارة لوحة تحكم الأدمن.
 * يتم تحميله في index.html ولكنه لا يعمل إلا إذا كان المستخدم "أدمن".
 */

// التأكد من تحميل الصفحة بالكامل قبل البدء
document.addEventListener('DOMContentLoaded', async () => {
    // ننتظر قليلاً حتى يتم تهيئة Supabase في الملف الرئيسي
    setTimeout(initAdminPanel, 1000);

    // (جديد) الاستماع لتغيرات حالة المصادقة (تسجيل الدخول/الخروج)
    if (typeof supabase !== 'undefined') {
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                console.log('User signed in, re-initializing admin panel...');
                initAdminPanel();
            }
        });
    }
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
    // إزالة المودال القديم إذا وجد لضمان تحديث الهيكلية (هذا يحل مشكلة اختفاء المحتوى)
    const existingModal = document.getElementById('admin-modal');
    if (existingModal) {
        existingModal.remove();
        console.log('Forced refresh of admin modal UI');
    }

    // تنظيف: إزالة الحاوية القديمة إذا وجدت لمنع التعارض
    const oldContainer = document.getElementById('admin-ui-container');
    if (oldContainer) {
        oldContainer.remove();
    }

    // 1. زر فتح اللوحة العائم
    if (!document.getElementById('btn-open-admin')) {
        const adminBtnHTML = `
            <button id="btn-open-admin" class="fixed bottom-24 left-6 z-[9999] p-3 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-transform hover:scale-110" title="لوحة تحكم المدير">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
        `;
        document.body.insertAdjacentHTML('beforeend', adminBtnHTML);
    }

    // 2. المودال (النافذة المنبثقة)
    // بما أننا قمنا بحذف المودال القديم في الأعلى، فلا داعي للتحقق هنا، ولكن سنتركه للأمان
    if (!document.getElementById('admin-modal')) {
        const modalHTML = `
        <div id="admin-modal" class="fixed inset-0 z-[10000] hidden" aria-labelledby="modal-title" role="dialog" aria-modal="true">
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
                                    <button id="tab-updates" class="admin-tab border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium">مزايا وتحديثات</button>
                                </nav>
                            </div>

                            <!-- محتوى تبويب الإعلانات (ثابت) -->
                            <div id="content-ads" class="admin-content block">
                                <div class="mb-4">
                                    <h4 class="text-md font-semibold dark:text-white mb-2">الإعلان الثابت (Static Ad)</h4>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        يتم عرض الصورة الموجودة في المسار <code dir="ltr" class="bg-gray-100 px-1 rounded">images/AD.webp</code>. لتغيير الإعلان، استبدل الملف في مجلد الصور.
                                    </p>
                                    
                                    <div class="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 flex flex-col items-center">
                                        <div class="mb-2 font-medium text-sm text-zinc-700 dark:text-zinc-300">المعاينة الحالية:</div>
                                        <img id="admin-static-ad-preview" src="" class="max-w-full h-auto max-h-64 rounded shadow-md border border-gray-200 bg-white" alt="Static Ad Preview" onerror="this.src='https://placehold.co/400x200?text=No+Ad+Found'">
                                        <button onclick="loadAdsData()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition shadow-sm">
                                            تحديث المعاينة
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- محتوى تبويب التصنيفات -->
                            <div id="content-tags" class="admin-content hidden">
                                 <div class="flex justify-between mb-4">
                                    <h4 class="text-md font-semibold dark:text-white">قائمة التصنيفات</h4>
                                    <div>
                                        <button id="btn-add-default-tags" class="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700 text-sm ml-2">استعادة الافتراضية</button>
                                        <button id="btn-add-tag" class="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-sm">إضافة تصنيف</button>
                                    </div>
                                </div>
                                 <div class="overflow-x-auto">
                                    <table class="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                                        <thead class="bg-zinc-50 dark:bg-zinc-800">
                                            <tr>
                                                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">الاسم</th>
                                                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">اللون (Tailwind)</th>
                                                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">إجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody id="tags-table-body" class="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                                            <!-- سيتم تعبئته بالجافاسكربت -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                             <!-- محتوى تبويب ربط التصنيفات -->
                            <div id="content-app-tags" class="admin-content hidden">
                                <div class="mb-4">
                                    <label for="select-app-for-tags" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">اختر التطبيق</label>
                                    <select id="select-app-for-tags" class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-zinc-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-zinc-800 dark:border-zinc-600 dark:text-white">
                                        <option value="">اختر تطبيقاً...</option>
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
                                        <option value="game-hrof">حروف عبقر</option>
                                    </select>
                                </div>
                                
                                <div id="app-tags-selection-area" class="hidden">
                                    <h4 class="text-md font-semibold mb-2 dark:text-white">حدد التصنيفات لهذا التطبيق:</h4>
                                    <div id="checkboxes-tags-container" class="space-y-2 mb-4">
                                        <!-- سيتم تعبئته -->
                                    </div>
                                    <button id="btn-save-app-tags" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">حفظ التغييرات</button>
                                </div>
                            </div>

                            <div id="content-updates" class="admin-content hidden">
                                <div class="flex justify-between mb-4">
                                    <h4 class="text-md font-semibold dark:text-white">قائمة المزايا والتحديثات</h4>
                                    <button id="btn-add-update" class="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 text-sm">إضافة سطر جديد</button>
                                </div>
                                <div class="overflow-x-auto">
                                    <table class="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
                                        <thead class="bg-zinc-50 dark:bg-zinc-800">
                                            <tr>
                                                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">الإصدار</th>
                                                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">التاريخ</th>
                                                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">الوصف</th>
                                                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">الحالة</th>
                                                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">إجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody id="updates-admin-table-body" class="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-700">
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // === مودال النماذج (Forms) ===
    if (!document.getElementById('admin-form-modal')) {
        const formModalHTML = `
        <div id="admin-form-modal" class="fixed inset-0 z-[11000] hidden" role="dialog">
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm transition-opacity"></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4 text-center">
                    <div class="relative transform overflow-hidden rounded-lg bg-white dark:bg-zinc-900 text-right shadow-xl transition-all sm:w-full sm:max-w-lg border border-zinc-200 dark:border-zinc-700">
                        <div class="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 sm:px-6 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-700">
                            <h3 class="text-lg font-bold leading-6 text-zinc-900 dark:text-zinc-100" id="form-modal-title">عنوان النافذة</h3>
                            <button onclick="closeFormModal()" class="text-zinc-400 hover:text-zinc-500 focus:outline-none">
                                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div class="px-4 py-4 sm:p-6 space-y-4" id="form-modal-body"></div>
                        <div class="bg-zinc-50 dark:bg-zinc-800 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 border-t border-zinc-200 dark:border-zinc-700">
                            <button type="button" id="btn-form-save" class="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto">حفظ</button>
                            <button type="button" onclick="closeFormModal()" class="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-zinc-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-zinc-600 sm:mt-0 sm:w-auto">إلغاء</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', formModalHTML);
    }

    // === مودال التأكيد (Confirm) ===
    if (!document.getElementById('admin-confirm-modal')) {
        const confirmModalHTML = `
        <div id="admin-confirm-modal" class="fixed inset-0 z-[12000] hidden" role="dialog">
            <div class="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm transition-opacity"></div>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
                <div class="flex min-h-full items-center justify-center p-4 text-center">
                    <div class="relative transform overflow-hidden rounded-lg bg-white dark:bg-zinc-900 text-right shadow-xl transition-all sm:w-full sm:max-w-md border border-zinc-200 dark:border-zinc-700">
                        <div class="bg-white dark:bg-zinc-900 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                            <div class="sm:flex sm:items-start sm:flex-row-reverse">
                                <div class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:mr-3">
                                    <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                    </svg>
                                </div>
                                <div class="mt-3 text-center sm:ml-4 sm:mr-0 sm:mt-0 sm:text-right flex-1">
                                    <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100" id="confirm-modal-title">تأكيد الحذف</h3>
                                    <div class="mt-2">
                                        <p class="text-sm text-gray-500 dark:text-gray-400" id="confirm-modal-message">هل أنت متأكد من القيام بهذا الإجراء؟</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="bg-gray-50 dark:bg-zinc-800 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                            <button type="button" id="btn-confirm-yes" class="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto">نعم، متأكد</button>
                            <button type="button" onclick="closeConfirmModal()" class="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-zinc-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-zinc-600 sm:mt-0 sm:w-auto">إلغاء</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', confirmModalHTML);
    }
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
        'tab-app-tags': 'content-app-tags',
        'tab-updates': 'content-updates'
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

            if (tabId === 'tab-ads') loadAdsData();
            if (tabId === 'tab-tags') loadTagsData();
            if (tabId === 'tab-app-tags') loadAppTagsData();
            if (tabId === 'tab-updates') loadUpdatesAdminData();
        };
    });



    document.getElementById('btn-add-tag').onclick = () => {
        showFormModal('إضافة تصنيف جديد', [
            { label: 'اسم التصنيف', name: 'name', type: 'text' },
            { label: 'لون التصنيف', name: 'color', type: 'color', value: '#3b82f6' }
        ], async (data) => {
            console.log('Adding tag with data:', data);
            if (!data.name || !data.color) throw new Error('الاسم واللون مطلوبان');
            
            // التأكد من أن اللون بصيغة صحيحة (Hex)
            if (data.color.startsWith('#') && data.color.length !== 7) {
                console.warn('Invalid hex color length:', data.color);
            }

            // نستخدم select للتأكد من نجاح العملية والحصول على البيانات
            const { data: newTag, error } = await supabase.from('tags').insert([{ name: data.name, color: data.color }]).select();
            if (error) throw error;
            console.log('Tag added successfully:', newTag);
            loadTagsData();
        });
    };

    const btnAddUpdate = document.getElementById('btn-add-update');
    if (btnAddUpdate) {
        btnAddUpdate.onclick = () => {
            showFormModal('إضافة سطر مزايا/تحديث جديد', [
                { label: 'رقم الإصدار', name: 'version', type: 'text', placeholder: 'مثال: 1.0' },
                { label: 'التاريخ', name: 'date_text', type: 'text', placeholder: 'مثال: 11-11-2025' },
                { label: 'الوصف', name: 'description', type: 'textarea', placeholder: 'وصف مختصر للتحديث أو الميزة' }
            ], async (data) => {
                if (!data.version || !data.date_text || !data.description) throw new Error('جميع الحقول مطلوبة');
                const { error } = await supabase.from('updates').insert([{
                    version: data.version,
                    date_text: data.date_text,
                    description: data.description,
                    is_active: true
                }]);
                if (error) throw error;
                await loadUpdatesAdminData();
            });
        };
    }

    // استعادة التصنيفات الافتراضية
    document.getElementById('btn-add-default-tags').onclick = async () => {
        const btn = document.getElementById('btn-add-default-tags');
        btn.disabled = true;
        btn.textContent = 'جاري الإضافة...';
        
        const defaultTags = [
            { name: 'الجوالات فقط', color: '#10b981' }, // أخضر
            { name: 'الشاشات فقط', color: '#3b82f6' }  // أزرق
        ];

        try {
            for (const tag of defaultTags) {
                // نتحقق أولاً إذا كان موجوداً بالاسم
                const { data: existing } = await supabase.from('tags').select('id').eq('name', tag.name).maybeSingle();
                if (!existing) {
                    await supabase.from('tags').insert([tag]);
                }
            }
            loadTagsData();
            alert('تمت استعادة التصنيفات الافتراضية بنجاح.');
        } catch (err) {
            alert('حدث خطأ: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'استعادة الافتراضية';
        }
    };

    // تغيير التطبيق في تبويب ربط التصنيفات
    document.getElementById('select-app-for-tags').onchange = loadAppTagsData;
    
    // حفظ ربط التصنيفات
    document.getElementById('btn-save-app-tags').onclick = saveAppTags;
}

// === دوال تحميل البيانات ===

async function loadAdsData() {
    // تحديث معاينة الإعلان الثابت
    const previewImg = document.getElementById('admin-static-ad-preview');
    if (previewImg) {
        const timestamp = new Date().getTime();
        previewImg.src = `images/AD.webp?v=${timestamp}`;
        console.log('Static ad preview refreshed');
    }
}

async function loadTagsData() {
    const tbody = document.getElementById('tags-table-body');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4">جاري التحميل...</td></tr>';

    try {
        const { data: tags, error } = await supabase.from('tags').select('*').order('created_at', { ascending: false });

        if (error) throw error;

        if (!tags || tags.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-gray-500">لا توجد تصنيفات حالياً. يمكنك إضافة تصنيفات جديدة أو استعادة الافتراضية.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        tags.forEach(tag => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-zinc-50 dark:hover:bg-zinc-800';

        let colorDisplay = '';
        if (tag.color && tag.color.startsWith('#')) {
            // إضافة border و shadow لضمان ظهور اللون حتى لو كان فاتحاً
            colorDisplay = `<span class="text-white px-2 py-1 rounded text-xs border border-gray-400 shadow-sm" style="background-color: ${tag.color}; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${tag.color}</span>`;
        } else {
            colorDisplay = `<span class="${tag.color} text-white px-2 py-1 rounded text-xs">${tag.color}</span>`;
        }

        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">${tag.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                ${colorDisplay}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="deleteTag('${tag.id}')" class="text-red-600 hover:text-red-900 ml-2">حذف</button>
                <button onclick="editTag('${tag.id}', '${tag.name}', '${tag.color}')" class="text-blue-600 hover:text-blue-900">تعديل</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    } catch (err) {
        console.error('Error loading tags:', err);
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-red-500 py-4">حدث خطأ في تحميل التصنيفات: ${err.message}</td></tr>`;
    }
}

async function loadUpdatesAdminData() {
    const tbody = document.getElementById('updates-admin-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-sm">جاري التحميل...</td></tr>';

    const { data: updates, error } = await supabase
        .from('updates')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-sm text-red-600 dark:text-red-400">${error.message}</td></tr>`;
        return;
    }

    if (!updates || updates.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-sm text-zinc-500 dark:text-zinc-300">لا توجد عناصر في قائمة المزايا والتحديثات حالياً.</td></tr>';
        return;
    }

    tbody.innerHTML = '';

    updates.forEach((item) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-zinc-50 dark:hover:bg-zinc-800';
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-zinc-900 dark:text-zinc-100">${item.version || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-zinc-500 dark:text-zinc-400">${item.date_text || ''}</td>
            <td class="px-6 py-4 text-sm text-zinc-700 dark:text-zinc-300 whitespace-normal max-w-xs">${item.description || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${item.is_active ? 'نشط' : 'مخفي'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="btn-toggle-update text-indigo-600 hover:text-indigo-900 ml-2">${item.is_active ? 'إخفاء' : 'إظهار'}</button>
                <button class="btn-edit-update text-blue-600 hover:text-blue-900 ml-2">تعديل</button>
                <button class="btn-delete-update text-red-600 hover:text-red-900">حذف</button>
            </td>
        `;
        const toggleBtn = tr.querySelector('.btn-toggle-update');
        const editBtn = tr.querySelector('.btn-edit-update');
        const deleteBtn = tr.querySelector('.btn-delete-update');

        if (toggleBtn) {
            toggleBtn.onclick = () => toggleUpdateStatus(item.id, !item.is_active);
        }
        if (editBtn) {
            editBtn.onclick = () => editUpdate(item.id, item.version || '', item.date_text || '', item.description || '');
        }
        if (deleteBtn) {
            deleteBtn.onclick = () => deleteUpdate(item.id);
        }

        tbody.appendChild(tr);
    });
}

async function loadAppTagsData() {
    console.log('loadAppTagsData triggered');
    const appIdEl = document.getElementById('select-app-for-tags');
    const selectionArea = document.getElementById('app-tags-selection-area');
    const container = document.getElementById('checkboxes-tags-container');

    if (!appIdEl || !selectionArea || !container) {
        console.error('Critical elements missing in loadAppTagsData');
        return;
    }

    const appId = appIdEl.value;

    if (!appId) {
        selectionArea.classList.add('hidden');
        return;
    }

    // إجبار العنصر على الظهور
    selectionArea.classList.remove('hidden');
    selectionArea.style.display = 'block'; 
    
    container.innerHTML = '<p class="text-sm text-gray-500 p-2">جاري تحميل البيانات...</p>';

    try {
        // جلب كل التاقات
        const { data: allTags, error: tagsError } = await supabase.from('tags').select('*');
        if (tagsError) throw tagsError;

        // جلب التاقات المرتبطة بهذا التطبيق
        const { data: appTags, error: appTagsError } = await supabase.from('app_tags').select('tag_id').eq('app_id', appId);
        if (appTagsError) throw appTagsError;
        
        const associatedTagIds = new Set(appTags?.map(item => item.tag_id));

        container.innerHTML = '';

        if (!allTags || allTags.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500 p-2">لا توجد تصنيفات مضافة بعد. انتقل لتبويب "التصنيفات" لإضافة تصنيفات جديدة.</p>';
            return;
        }

        allTags.forEach(tag => {
            const isChecked = associatedTagIds.has(tag.id) ? 'checked' : '';
            const div = document.createElement('div');
            div.className = 'flex items-center space-x-2 space-x-reverse bg-zinc-50 dark:bg-zinc-800 p-2 rounded border border-zinc-200 dark:border-zinc-700';
            
            let colorSpan = '';
            if (tag.color && tag.color.startsWith('#')) {
                 colorSpan = `<span class="w-4 h-4 inline-block rounded-full mr-1 border border-gray-300 shadow-sm" style="background-color: ${tag.color};"></span>`;
            } else {
                 colorSpan = `<span class="${tag.color} w-3 h-3 inline-block rounded-full mr-1"></span>`;
            }

            div.innerHTML = `
                <input type="checkbox" id="tag-${tag.id}" value="${tag.id}" class="app-tag-checkbox h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" ${isChecked}>
                <label for="tag-${tag.id}" class="text-sm font-medium text-zinc-900 dark:text-zinc-100 cursor-pointer select-none flex-1 flex items-center">
                    ${tag.name} 
                    ${colorSpan}
                </label>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error('Error in loadAppTagsData:', err);
        container.innerHTML = `<p class="text-sm text-red-500 p-2">حدث خطأ: ${err.message}</p>`;
        alert('حدث خطأ أثناء تحميل البيانات: ' + err.message);
    }
}

async function saveAppTags() {
    const appId = document.getElementById('select-app-for-tags').value;
    const checkboxes = document.querySelectorAll('.app-tag-checkbox:checked');
    const selectedTagIds = Array.from(checkboxes).map(cb => cb.value);
    const btn = document.getElementById('btn-save-app-tags');

    if (!appId) return;

    btn.textContent = 'جاري الحفظ...';
    btn.disabled = true;

    try {
        // 1. حذف العلاقات القديمة
        const { error: deleteError } = await supabase.from('app_tags').delete().eq('app_id', appId);
        if (deleteError) throw deleteError;

        // 2. إضافة العلاقات الجديدة
        if (selectedTagIds.length > 0) {
            const insertData = selectedTagIds.map(tagId => ({ app_id: appId, tag_id: tagId }));
            const { error: insertError } = await supabase.from('app_tags').insert(insertData);
            if (insertError) throw insertError;
        }

        btn.textContent = 'تم الحفظ بنجاح!';
        btn.classList.remove('bg-green-600', 'hover:bg-green-700');
        btn.classList.add('bg-blue-600', 'hover:bg-blue-700');
    } catch (err) {
        console.error('Error saving app tags:', err);
        btn.textContent = 'حدث خطأ!';
        btn.classList.remove('bg-green-600', 'hover:bg-green-700');
        btn.classList.add('bg-red-600', 'hover:bg-red-700');
        alert('حدث خطأ أثناء حفظ التصنيفات: ' + err.message);
    }

    setTimeout(() => {
        btn.textContent = 'حفظ التغييرات';
        btn.disabled = false;
        btn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'bg-red-600', 'hover:bg-red-700');
        btn.classList.add('bg-green-600', 'hover:bg-green-700');
    }, 2000);
}

// === دوال مساعدة (Global Scope) ===
window.toggleAdStatus = async (id, newStatus) => {
    await supabase.from('ads').update({ is_active: newStatus }).eq('id', id);
    loadAdsData();
};

window.toggleUpdateStatus = async (id, newStatus) => {
    await supabase.from('updates').update({ is_active: newStatus }).eq('id', id);
    await loadUpdatesAdminData();
};

window.deleteAd = (id) => {
    showConfirmModal('حذف الإعلان', 'هل أنت متأكد من حذف هذا الإعلان نهائياً؟', async () => {
        const { error } = await supabase.from('ads').delete().eq('id', id);
        if (error) throw error;
        loadAdsData();
    });
};

window.editAd = (id, oldTitle, oldImage, oldLink, oldFrequency) => {
    showFormModal('تعديل الإعلان', [
        { label: 'عنوان الإعلان', name: 'title', value: oldTitle },
        { label: 'رابط الصورة', name: 'imageUrl', value: oldImage },
        { label: 'رابط التوجيه (اختياري)', name: 'linkUrl', value: oldLink },
        { label: 'تكرار الظهور', name: 'frequency', type: 'select', value: oldFrequency, options: [
            { value: 'once', text: 'مرة واحدة (Once)' },
            { value: 'always', text: 'دائماً (Always)' }
        ]}
    ], async (data) => {
        if (!data.title || !data.imageUrl) throw new Error('العنوان والصورة مطلوبان');
        const { error } = await supabase.from('ads').update({ 
            title: data.title, 
            image_url: data.imageUrl,
            link_url: data.linkUrl,
            frequency: data.frequency
        }).eq('id', id);
        if (error) throw error;
        loadAdsData();
    });
};

window.deleteTag = (id) => {
    showConfirmModal('حذف التصنيف', 'هل أنت متأكد؟ سيتم إزالته من جميع التطبيقات المرتبطة.', async () => {
        const { error } = await supabase.from('tags').delete().eq('id', id);
        if (error) throw error;
        loadTagsData();
    });
};

window.editTag = (id, oldName, oldColor) => {
    // إذا كان اللون القديم كلاس Tailwind، نعرض لون افتراضي أو نحاول تحويله يدوياً
    // هنا سنستخدم الأسود كافتراضي إذا لم يكن hex
    const isHex = oldColor && oldColor.startsWith('#');
    const defaultColor = isHex ? oldColor : '#000000';

    showFormModal('تعديل التصنيف', [
        { label: 'اسم التصنيف', name: 'name', value: oldName },
        { label: 'لون التصنيف', name: 'color', type: 'color', value: defaultColor }
    ], async (data) => {
        if (!data.name || !data.color) throw new Error('الاسم واللون مطلوبان');
        const { error } = await supabase.from('tags').update({ name: data.name, color: data.color }).eq('id', id);
        if (error) throw error;
        loadTagsData();
    });
};

window.deleteUpdate = (id) => {
    showConfirmModal('حذف السطر', 'هل أنت متأكد من حذف هذا السطر من قائمة المزايا والتحديثات؟', async () => {
        const { error } = await supabase.from('updates').delete().eq('id', id);
        if (error) throw error;
        await loadUpdatesAdminData();
    });
};

window.editUpdate = (id, oldVersion, oldDateText, oldDescription) => {
    showFormModal('تعديل سطر مزايا/تحديث', [
        { label: 'رقم الإصدار', name: 'version', type: 'text', value: oldVersion },
        { label: 'التاريخ', name: 'date_text', type: 'text', value: oldDateText },
        { label: 'الوصف', name: 'description', type: 'textarea', value: oldDescription }
    ], async (data) => {
        if (!data.version || !data.date_text || !data.description) throw new Error('جميع الحقول مطلوبة');
        const { error } = await supabase.from('updates').update({
            version: data.version,
            date_text: data.date_text,
            description: data.description
        }).eq('id', id);
        if (error) throw error;
        await loadUpdatesAdminData();
    });
};

// === دوال إدارة النوافذ المنبثقة (Modals) ===

window.closeFormModal = () => {
    document.getElementById('admin-form-modal').classList.add('hidden');
    document.getElementById('form-modal-body').innerHTML = '';
};

window.showFormModal = (title, fields, onSubmit) => {
    document.getElementById('form-modal-title').textContent = title;
    const body = document.getElementById('form-modal-body');
    body.innerHTML = '';

    fields.forEach(field => {
        const div = document.createElement('div');
        div.className = 'text-right';
        
        const label = document.createElement('label');
        label.className = 'block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1';
        label.textContent = field.label;
        div.appendChild(label);

        let input;
        if (field.type === 'select') {
            input = document.createElement('select');
            input.className = 'block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-600 dark:text-white sm:text-sm p-2';
            field.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.text;
                if (opt.value === field.value) option.selected = true;
                input.appendChild(option);
            });
        } else if (field.type === 'textarea') {
            input = document.createElement('textarea');
            input.className = 'block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-600 dark:text-white sm:text-sm p-2';
            if (field.value) input.value = field.value;
        } else {
            input = document.createElement('input');
            input.type = field.type || 'text';
            
            if (input.type === 'color') {
                input.className = 'block w-full h-10 rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-600 dark:text-white p-1 cursor-pointer';
            } else {
                input.className = 'block w-full rounded-md border-zinc-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-600 dark:text-white sm:text-sm p-2';
            }

            if (field.value) input.value = field.value;
            if (field.placeholder) input.placeholder = field.placeholder;
        }
        input.name = field.name;
        input.id = `field-${field.name}`;
        
        div.appendChild(input);
        body.appendChild(div);
    });

    const saveBtn = document.getElementById('btn-form-save');
    const newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);
    
    newBtn.onclick = async () => {
        const formData = {};
        fields.forEach(field => {
            formData[field.name] = document.getElementById(`field-${field.name}`).value;
        });
        
        newBtn.disabled = true;
        newBtn.textContent = 'جاري الحفظ...';
        
        try {
            await onSubmit(formData);
            window.closeFormModal();
        } catch (err) {
            alert('حدث خطأ: ' + err.message);
        } finally {
            newBtn.disabled = false;
            newBtn.textContent = 'حفظ';
        }
    };

    document.getElementById('admin-form-modal').classList.remove('hidden');
};

window.closeConfirmModal = () => {
    document.getElementById('admin-confirm-modal').classList.add('hidden');
};

window.showConfirmModal = (title, message, onYes) => {
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').textContent = message;
    
    const yesBtn = document.getElementById('btn-confirm-yes');
    const newBtn = yesBtn.cloneNode(true);
    yesBtn.parentNode.replaceChild(newBtn, yesBtn);
    
    newBtn.onclick = async () => {
        newBtn.disabled = true;
        newBtn.textContent = 'جاري التنفيذ...';
        try {
            await onYes();
            window.closeConfirmModal();
        } catch (err) {
            alert('خطأ: ' + err.message);
        } finally {
            newBtn.disabled = false;
            newBtn.textContent = 'نعم، متأكد';
        }
    };

    document.getElementById('admin-confirm-modal').classList.remove('hidden');
};
