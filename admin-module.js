/*
===========================================================
 SHEKINAH PHARMACY
 CEO MODULE CONTROLLER
===========================================================

 File:
     ceo-module.js

 Responsibilities:
     - CEO authentication
     - CEO authorization
     - Sidebar navigation
     - Dashboard loading
     - Sales module
     - Inventory module
     - Purchases module
     - Customers module
     - Branches module
     - Staff module
     - Suppliers module
     - Finance module
     - Reports module
     - Notifications module
     - Settings module
     - Search
     - Refresh
     - Logout
===========================================================
*/


/* ========================================================
   SUPABASE
======================================================== */

const SUPABASE_URL =
    "https://manyvsuibdemvclgxoyl.supabase.co";

/*
 IMPORTANT:
 Use the SAME publishable/anon key already used
 by your existing index.html.

 Do NOT use the Supabase service-role key here.
*/

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_ZMeTYOLRhxGJpgKxmuCvMw_OVNxGe3X";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


/* ========================================================
   STATE
======================================================== */

let currentSession = null;
let currentStaff = null;
let currentModule = "dashboard";


/* ========================================================
   MODULE DEFINITIONS
======================================================== */

const CEO_MODULES = {

    dashboard: {
        title: "CEO Dashboard",
        description:
            "Business overview across all Shekinah Pharmacy branches."
    },

    sales: {
        title: "Sales / POS",
        description:
            "Monitor completed and pending sales across branches."
    },

    inventory: {
        title: "Inventory",
        description:
            "Manage pharmacy stock, batches, quantities and expiry dates."
    },

    purchases: {
        title: "Purchases",
        description:
            "Monitor supplier purchases and received stock."
    },

    customers: {
        title: "Customers",
        description:
            "Manage customer accounts and outstanding balances."
    },

    branches: {
        title: "Branches",
        description:
            "Manage all Shekinah Pharmacy branches."
    },

    staff: {
        title: "Staff & Admin",
        description:
            "Manage employees, administrators, roles and permissions."
    },

    attendance: {
        title: "Staff Attendance",
        description:
            "Review clock times, approve attendance, record absences and manage days worked."
    },

    suppliers: {
        title: "Suppliers",
        description:
            "Manage suppliers and supplier information."
    },

    finance: {
        title: "Finance",
        description:
            "Monitor expenses and financial activity."
    },

    reports: {
        title: "Reports & Analytics",
        description:
            "Business performance and management reports."
    },

    notifications: {
        title: "Notifications",
        description:
            "System notifications and CEO alerts."
    },

    settings: {
        title: "Settings",
        description:
            "CEO system and account settings."
    }

};


/* ========================================================
   HELPERS
======================================================== */

function money(value) {

    return new Intl.NumberFormat(
        "en-NG",
        {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0
        }
    ).format(
        Number(value || 0)
    );
}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatDate(value) {

    if (!value) {
        return "-";
    }

    return new Date(value)
        .toLocaleDateString(
            "en-NG",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
}


function formatDateTime(value) {

    if (!value) {
        return "-";
    }

    return new Date(value)
        .toLocaleString("en-NG");
}


function badge(value) {

    const text =
        String(value || "")
            .replaceAll("_", " ");

    const lower =
        text.toLowerCase();

    let type = "info";

    if (
        lower.includes("active") ||
        lower.includes("completed") ||
        lower.includes("paid") ||
        lower.includes("received")
    ) {
        type = "success";
    }

    if (
        lower.includes("pending") ||
        lower.includes("partial") ||
        lower.includes("draft") ||
        lower.includes("requested")
    ) {
        type = "warning";
    }

    if (
        lower.includes("cancel") ||
        lower.includes("inactive") ||
        lower.includes("blocked") ||
        lower.includes("expired")
    ) {
        type = "danger";
    }

    return `
        <span class="badge badge-${type}">
            ${escapeHTML(text)}
        </span>
    `;
}


function showLoading() {

    document.getElementById(
        "moduleContent"
    ).innerHTML = `
        <div class="loading">
            Loading live data...
        </div>
    `;
}


function showError(error) {

    document.getElementById(
        "moduleContent"
    ).innerHTML = `
        <div class="error">
            ${escapeHTML(
                error?.message ||
                "Unable to load this module."
            )}
        </div>
    `;
}


function renderTable(headers, rows) {

    if (!rows.length) {

        return `
            <div class="empty">
                No records found.
            </div>
        `;
    }

    return `
        <div class="table-wrapper">

            <table class="data-table">

                <thead>

                    <tr>

                        ${headers.map(
                            header => `
                                <th>
                                    ${escapeHTML(header)}
                                </th>
                            `
                        ).join("")}

                    </tr>

                </thead>

                <tbody>

                    ${rows.map(
                        row => `
                            <tr>

                                ${row.map(
                                    cell => `
                                        <td>
                                            ${cell}
                                        </td>
                                    `
                                ).join("")}

                            </tr>
                        `
                    ).join("")}

                </tbody>

            </table>

        </div>
    `;
}


/* ========================================================
   AUTHENTICATION
======================================================== */

async function initializeCEO() {

    try {

        const {
            data,
            error
        } =
            await supabaseClient.auth.getSession();


        if (error) {
            throw error;
        }


        currentSession =
            data.session;


        if (!currentSession) {
            showStartupError("Please sign in before opening the Admin Dashboard.");
            return;
        }


        await loadCEOProfile();

        bindNavigation();

        bindGlobalButtons();

        await loadDashboard();


    } catch (error) {
        console.error("Admin initialization error:", error);
        showStartupError(error?.message || "Unable to open the Admin Dashboard.");
    }
}

function showStartupError(message) {
    const main = document.querySelector(".main");
    if (!main) {
        alert(message);
        return;
    }
    const existing = document.getElementById("startupError");
    if (existing) existing.remove();

    const box = document.createElement("div");
    box.id = "startupError";
    box.style.cssText =
        "margin:24px;padding:18px;border:1px solid #fecaca;border-radius:12px;background:#fff1f2;color:#991b1b;font-weight:600;";
    box.innerHTML =
        `<div style="margin-bottom:8px;">Admin Dashboard could not start</div>
         <div style="font-weight:500;">${escapeHtml(message)}</div>`;
    main.appendChild(box);
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[ch]));
}


/* ========================================================
   CEO PROFILE
======================================================== */

async function loadCEOProfile() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("staff")
            .select(`
                id,
                staff_id,
                full_name,
                email,
                phone,
                role_id,
                branch_id,
                account_status,
                employment_status,
                roles (
                    role_name
                ),
                branches (
                    branch_name
                )
            `)
            .eq(
                "auth_user_id",
                currentSession.user.id
            )
            .maybeSingle();


    if (error) {
        throw error;
    }


    if (!data) {

        throw new Error(
            "CEO staff profile was not found."
        );
    }


    if (
        data.account_status !==
        "active"
    ) {

        throw new Error(
            "Your CEO account is inactive."
        );
    }


    const role =
        data.roles?.role_name
            ?.toLowerCase();


    if (role !== "ceo" && role !== "admin") {
        throw new Error(
            "Admin or CEO access is required."
        );
    }


    currentStaff = data;


    const name =
        data.full_name ||
        "CEO";


    document.getElementById(
        "userName"
    ).textContent =
        name;


    document.getElementById(
        "welcomeName"
    ).textContent =
        name.split(" ")[0];


    document.getElementById(
        "userAvatar"
    ).textContent =
        name
            .charAt(0)
            .toUpperCase();
}


/* ========================================================
   NAVIGATION
======================================================== */

function bindNavigation() {

    document
        .querySelectorAll(
            "[data-module]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const module =
                        button.dataset.module;

                    navigateToModule(
                        module
                    );
                }
            );

        });
}


function navigateToModule(module) {

    if (
        !CEO_MODULES[module]
    ) {
        return;
    }


    currentModule =
        module;


    document
        .querySelectorAll(
            ".nav-button"
        )
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.module ===
                module
            );

        });


    /*
    Dashboard home
    */

    if (
        module ===
        "dashboard"
    ) {

        showDashboard();

        closeMobileSidebar();

        return;
    }


    /*
    Open CEO module
    */

    document.getElementById(
        "dashboard-container"
    ).style.display =
        "none";


    document.getElementById(
        "module-container"
    ).style.display =
        "block";


    document.getElementById(
        "pageTitle"
    ).textContent =
        CEO_MODULES[module].title;


    document.getElementById(
        "moduleTitle"
    ).textContent =
        CEO_MODULES[module].title;


    document.getElementById(
        "moduleDescription"
    ).textContent =
        CEO_MODULES[module].description;


    closeMobileSidebar();


    loadModule(module);
}


function showDashboard() {

    document.getElementById(
        "dashboard-container"
    ).style.display =
        "block";


    document.getElementById(
        "module-container"
    ).style.display =
        "none";


    document.getElementById(
        "pageTitle"
    ).textContent =
        "CEO Dashboard";


    loadDashboard();
}


/* ========================================================
   DASHBOARD
======================================================== */

async function loadDashboard() {

    try {

        await Promise.all([

            loadTodaySales(),

            loadInventoryValue(),

            loadCustomerDebt(),

            loadBranchCount(),

            loadBranchPerformance(),

            loadRecentActivity()

        ]);

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );
    }
}


/* ========================================================
   TODAY SALES
======================================================== */

async function loadTodaySales() {

    const start =
        new Date();

    start.setHours(
        0,
        0,
        0,
        0
    );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("sales")
            .select("total")
            .eq(
                "sale_status",
                "completed"
            )
            .gte(
                "created_at",
                start.toISOString()
            );


    if (error) {
        throw error;
    }


    const total =
        (data || [])
            .reduce(
                (sum, sale) =>
                    sum +
                    Number(
                        sale.total || 0
                    ),
                0
            );


    document.getElementById(
        "statTodaySales"
    ).textContent =
        money(total);
}


/* ========================================================
   INVENTORY VALUE
======================================================== */

async function loadInventoryValue() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("inventory")
            .select(
                "quantity,purchase_price"
            )
            .eq(
                "status",
                "active"
            );


    if (error) {
        throw error;
    }


    const value =
        (data || [])
            .reduce(
                (sum, item) =>
                    sum +
                    (
                        Number(
                            item.quantity || 0
                        ) *
                        Number(
                            item.purchase_price || 0
                        )
                    ),
                0
            );


    document.getElementById(
        "statInventoryValue"
    ).textContent =
        money(value);
}


/* ========================================================
   CUSTOMER DEBT
======================================================== */

async function loadCustomerDebt() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("customers")
            .select(
                "current_balance"
            )
            .gt(
                "current_balance",
                0
            );


    if (error) {
        throw error;
    }


    const debt =
        (data || [])
            .reduce(
                (sum, customer) =>
                    sum +
                    Number(
                        customer.current_balance ||
                        0
                    ),
                0
            );


    document.getElementById(
        "statCustomerDebt"
    ).textContent =
        money(debt);
}


/* ========================================================
   BRANCH COUNT
======================================================== */

async function loadBranchCount() {

    const {
        count,
        error
    } =
        await supabaseClient
            .from("branches")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "status",
                "active"
            );


    if (error) {
        throw error;
    }


    document.getElementById(
        "statBranches"
    ).textContent =
        count || 0;
}


/* ========================================================
   BRANCH PERFORMANCE
======================================================== */

async function loadBranchPerformance() {

    const box =
        document.getElementById(
            "branchPerformance"
        );


    const {
        data: branches,
        error: branchError
    } =
        await supabaseClient
            .from("branches")
            .select(
                "id,branch_code,branch_name"
            )
            .eq(
                "status",
                "active"
            )
            .order(
                "branch_name"
            );


    if (branchError) {
        throw branchError;
    }


    const {
        data: sales,
        error: salesError
    } =
        await supabaseClient
            .from("sales")
            .select(
                "branch_id,total"
            )
            .eq(
                "sale_status",
                "completed"
            );


    if (salesError) {
        throw salesError;
    }


    const totals = {};


    (sales || [])
        .forEach(sale => {

            if (!totals[sale.branch_id]) {
                totals[sale.branch_id] = 0;
            }

            totals[sale.branch_id] +=
                Number(
                    sale.total || 0
                );

        });


    const rows =
        (branches || [])
            .map(branch => {

                return [

                    escapeHTML(
                        branch.branch_code
                    ),

                    escapeHTML(
                        branch.branch_name
                    ),

                    money(
                        totals[branch.id] || 0
                    )

                ];

            });


    box.innerHTML =
        renderTable(
            [
                "Code",
                "Branch",
                "Sales"
            ],
            rows
        );
}


/* ========================================================
   RECENT ACTIVITY
======================================================== */

async function loadRecentActivity() {

    const box =
        document.getElementById(
            "recentActivity"
        );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("audit_logs")
            .select(`
                action,
                module,
                description,
                created_at
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(10);


    if (error) {
        throw error;
    }


    if (!data?.length) {

        box.innerHTML = `
            <div class="empty">
                No recent activity.
            </div>
        `;

        return;
    }


    box.innerHTML =
        renderTable(
            [
                "Action",
                "Module",
                "Description",
                "Date"
            ],
            data.map(item => [

                escapeHTML(
                    item.action || "-"
                ),

                escapeHTML(
                    item.module || "-"
                ),

                escapeHTML(
                    item.description || "-"
                ),

                formatDateTime(
                    item.created_at
                )

            ])
        );
}


/* ========================================================
   MODULE LOADER
======================================================== */

async function loadModule(module) {

    showLoading();


    try {

        switch (module) {

            case "sales":
                await loadSalesModule();
                break;

            case "inventory":
                await loadInventoryModule();
                break;

            case "purchases":
                await loadPurchasesModule();
                break;

            case "customers":
                await loadCustomersModule();
                break;

            case "branches":
                await loadBranchesModule();
                break;

            case "staff":
                await loadStaffModule();
                break;

            case "attendance":
                await loadAttendanceModule();
                break;

            case "suppliers":
                await loadSuppliersModule();
                break;

            case "finance":
                await loadFinanceModule();
                break;

            case "reports":
                await loadReportsModule();
                break;

            case "notifications":
                await loadNotificationsModule();
                break;

            case "settings":
                await loadSettingsModule();
                break;

            default:
                showError(
                    new Error(
                        "Unknown CEO module."
                    )
                );

        }

    } catch (error) {

        console.error(
            module,
            error
        );

        showError(error);
    }
}


/* ========================================================
   SALES MODULE
======================================================== */

async function loadSalesModule() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("sales")
            .select(`
                id,
                sale_number,
                branch_id,
                total,
                amount_paid,
                balance_due,
                payment_status,
                sale_status,
                created_at
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(200);


    if (error) {
        throw error;
    }


    document.getElementById(
        "moduleContent"
    ).innerHTML = `

        <div class="toolbar">

            <input
                class="search-input"
                id="moduleSearch"
                placeholder="Search sales..."
            >

            <button
                class="button button-primary"
                id="newSaleButton"
            >
                + New Sale
            </button>

        </div>

        <div id="moduleTable">
            ${renderTable(

                [
                    "Sale Number",
                    "Total",
                    "Paid",
                    "Balance",
                    "Payment",
                    "Status",
                    "Date"
                ],

                (data || []).map(
                    sale => [

                        escapeHTML(
                            sale.sale_number
                        ),

                        money(
                            sale.total
                        ),

                        money(
                            sale.amount_paid
                        ),

                        money(
                            sale.balance_due
                        ),

                        badge(
                            sale.payment_status
                        ),

                        badge(
                            sale.sale_status
                        ),

                        formatDateTime(
                            sale.created_at
                        )

                    ]
                )

            )}
        </div>
    `;


    activateSearch();
}


/* ========================================================
   INVENTORY MODULE
======================================================== */

async function loadInventoryModule() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("inventory")
            .select(`
                id,
                product_name,
                generic_name,
                brand_name,
                category,
                batch_number,
                quantity,
                minimum_stock,
                purchase_price,
                selling_price,
                expiry_date,
                branch_id,
                status
            `)
            .order(
                "product_name"
            )
            .limit(500);


    if (error) {
        throw error;
    }


    const lowStock =
        (data || [])
            .filter(
                item =>
                    Number(
                        item.quantity || 0
                    ) <=
                    Number(
                        item.minimum_stock || 0
                    )
            )
            .length;


    document.getElementById(
        "moduleContent"
    ).innerHTML = `

        <div class="toolbar">

            <input
                class="search-input"
                id="moduleSearch"
                placeholder="Search products, batch or category..."
            >

            <button
                class="button button-primary"
                id="newInventoryButton"
            >
                + Add Stock
            </button>

        </div>

        <p
            style="
                margin-bottom:15px;
                color:#64748b;
                font-size:12px;
            "
        >
            ${data?.length || 0}
            inventory records.
            ${lowStock}
            low-stock records.
        </p>

        <div id="moduleTable">

            ${renderTable(

                [
                    "Product",
                    "Generic",
                    "Brand",
                    "Batch",
                    "Qty",
                    "Min",
                    "Cost",
                    "Selling",
                    "Expiry",
                    "Status"
                ],

                (data || []).map(
                    item => [

                        escapeHTML(
                            item.product_name
                        ),

                        escapeHTML(
                            item.generic_name || "-"
                        ),

                        escapeHTML(
                            item.brand_name || "-"
                        ),

                        escapeHTML(
                            item.batch_number || "-"
                        ),

                        escapeHTML(
                            item.quantity
                        ),

                        escapeHTML(
                            item.minimum_stock
                        ),

                        money(
                            item.purchase_price
                        ),

                        money(
                            item.selling_price
                        ),

                        formatDate(
                            item.expiry_date
                        ),

                        badge(
                            item.status
                        )

                    ]
                )

            )}

        </div>
    `;


    activateSearch();
}


/* ========================================================
   PURCHASES MODULE
======================================================== */

async function loadPurchasesModule() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("purchases")
            .select(`
                id,
                purchase_number,
                supplier_id,
                branch_id,
                total,
                purchase_status,
                received_at,
                created_at
            `)
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(200);


    if (error) {
        throw error;
    }


    document.getElementById(
        "moduleContent"
    ).innerHTML = `

        <div class="toolbar">

            <input
                class="search-input"
                id="moduleSearch"
                placeholder="Search purchases..."
            >

            <button
                class="button button-primary"
                id="newPurchaseButton"
            >
                + New Purchase
            </button>

        </div>

        <div id="moduleTable">

            ${renderTable(

                [
                    "Purchase Number",
                    "Supplier",
                    "Total",
                    "Status",
                    "Received",
                    "Created"
                ],

                (data || []).map(
                    item => [

                        escapeHTML(
                            item.purchase_number
                        ),

                        escapeHTML(
                            item.supplier_id || "-"
                        ),

                        money(
                            item.total
                        ),

                        badge(
                            item.purchase_status
                        ),

                        formatDate(
                            item.received_at
                        ),

                        formatDateTime(
                            item.created_at
                        )

                    ]
                )

            )}

        </div>
    `;


    activateSearch();
}


/* ========================================================
   CUSTOMERS MODULE
======================================================== */

async function loadCustomersModule() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("customers")
            .select(`
                id,
                customer_number,
                full_name,
                phone,
                email,
                credit_limit,
                current_balance,
                status,
                created_at
            `)
            .order(
                "full_name"
            )
            .limit(500);


    if (error) {
        throw error;
    }


    document.getElementById(
        "moduleContent"
    ).innerHTML = `

        <div class="toolbar">

            <input
                class="search-input"
                id="moduleSearch"
                placeholder="Search customers..."
            >

            <button
                class="button button-primary"
                id="newCustomerButton"
            >
                + Register Customer
            </button>

        </div>

        <div id="moduleTable">

            ${renderTable(

                [
                    "Customer #",
                    "Name",
                    "Phone",
                    "Email",
                    "Credit Limit",
                    "Balance",
                    "Status"
                ],

                (data || []).map(
                    item => [

                        escapeHTML(
                            item.customer_number
                        ),

                        escapeHTML(
                            item.full_name
                        ),

                        escapeHTML(
                            item.phone || "-"
                        ),

                        escapeHTML(
                            item.email || "-"
                        ),

                        money(
                            item.credit_limit
                        ),

                        money(
                            item.current_balance
                        ),

                        badge(
                            item.status
                        )

                    ]
                )

            )}

        </div>
    `;


    activateSearch();
}


/* ========================================================
   BRANCHES MODULE
======================================================== */

async function loadBranchesModule() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("branches")
            .select(`
                id,
                branch_code,
                branch_name,
                address,
                city,
                state,
                phone,
                email,
                manager_user_id,
                status,
                created_at
            `)
            .order(
                "branch_name"
            );


    if (error) {
        throw error;
    }


    document.getElementById(
        "moduleContent"
    ).innerHTML = `

        <div class="toolbar">

            <input
                class="search-input"
                id="moduleSearch"
                placeholder="Search branches..."
            >

            <button
                class="button button-primary"
                id="newBranchButton"
            >
                + Add Branch
            </button>

        </div>

        <div id="moduleTable">

            ${renderTable(

                [
                    "Code",
                    "Branch",
                    "Address",
                    "City",
                    "Phone",
                    "Status"
                ],

                (data || []).map(
                    item => [

                        escapeHTML(
                            item.branch_code
                        ),

                        escapeHTML(
                            item.branch_name
                        ),

                        escapeHTML(
                            item.address || "-"
                        ),

                        escapeHTML(
                            item.city || "-"
                        ),

                        escapeHTML(
                            item.phone || "-"
                        ),

                        badge(
                            item.status
                        )

                    ]
                )

            )}

        </div>
    `;


    activateSearch();
}


/* ========================================================
   STAFF MODULE
======================================================== */

async function loadStaffModule() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("staff")
            .select(`
                id,
                staff_id,
                full_name,
                email,
                phone,
                department,
                job_title,
                account_status,
                employment_status,
                date_joined,
                salary,
                roles (
                    role_name
                ),
                branches (
                    branch_name
                )
            `)
            .order(
                "full_name"
            )
            .limit(500);


    if (error) {
        throw error;
    }


    document.getElementById(
        "moduleContent"
    ).innerHTML = `

        <div class="toolbar">

            <input
                class="search-input"
                id="moduleSearch"
                placeholder="Search staff..."
            >

            <button
                class="button button-primary"
                id="newStaffButton"
            >
                + Add Staff
            </button>

        </div>

        <div id="moduleTable">

            ${renderTable(

                [
                    "Staff ID",
                    "Name",
                    "Email",
                    "Job",
                    "Role",
                    "Branch",
                    "Account",
                    "Employment"
                ],

                (data || []).map(
                    item => [

                        escapeHTML(
                            item.staff_id
                        ),

                        escapeHTML(
                            item.full_name
                        ),

                        escapeHTML(
                            item.email
                        ),

                        escapeHTML(
                            item.job_title || "-"
                        ),

                        badge(
                            item.roles?.role_name
                        ),

                        escapeHTML(
                            item.branches?.branch_name || "-"
                        ),

                        badge(
                            item.account_status
                        ),

                        badge(
                            item.employment_status
                        )

                    ]
                )

            )}

        </div>
    `;


    activateSearch();
}


/* ========================================================
   ATTENDANCE MODULE
======================================================== */

async function loadAttendanceModule() {
    const { data: rows, error } = await supabaseClient
        .from("staff_attendance")
        .select(`
            id,
            attendance_date,
            clock_in,
            clock_out,
            status,
            reason,
            source,
            submitted_at,
            approved_at,
            staff_id,
            staff:staff_id ( id, staff_id, full_name, job_title, branch_id, branches(branch_name) ),
            approver:approved_by ( full_name )
        `)
        .order("attendance_date", { ascending: false })
        .limit(1000);

    if (error) throw error;

    const records = rows || [];
    document.getElementById("moduleContent").innerHTML = `
        <div class="toolbar" style="flex-wrap:wrap;gap:10px;">
            <input class="search-input" id="attendanceSearch" placeholder="Search staff or status...">
            <input class="search-input" id="attendanceDate" type="date" title="Filter by date">
            <button class="button button-primary" id="refreshAttendance">Refresh</button>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0;">
            <span class="badge">Present: ${records.filter(r=>r.status==='present').length}</span>
            <span class="badge">Late: ${records.filter(r=>r.status==='late').length}</span>
            <span class="badge">Pending: ${records.filter(r=>r.status==='pending').length}</span>
            <span class="badge">Absent: ${records.filter(r=>r.status==='absent').length}</span>
            <span class="badge">Leave: ${records.filter(r=>r.status==='leave').length}</span>
            <span class="badge">Missing Time: ${records.filter(r=>r.status==='missing_time').length}</span>
        </div>
        <div id="attendanceTable"></div>
    `;

    const render = () => {
        const q = (document.getElementById("attendanceSearch")?.value || "").toLowerCase().trim();
        const date = document.getElementById("attendanceDate")?.value || "";
        const filtered = records.filter(r => {
            const text = `${r.staff?.staff_id||''} ${r.staff?.full_name||''} ${r.status||''} ${r.reason||''}`.toLowerCase();
            return (!q || text.includes(q)) && (!date || r.attendance_date === date);
        });
        document.getElementById("attendanceTable").innerHTML = renderTable(
            ["Date","Staff","Branch","Clock In","Clock Out","Status","Reason","Source","Action"],
            filtered.map(r => {
                const pending = r.status === "pending";
                const action = pending
                    ? `<div style="display:flex;gap:6px;flex-wrap:wrap;">
                         <button class="button button-primary attendance-approve" data-id="${r.id}">Approve</button>
                         <button class="button attendance-edit" data-id="${r.id}">Review / Correct</button>
                       </div>`
                    : `<button class="button attendance-edit" data-id="${r.id}">Edit</button>`;
                return [
                    escapeHTML(r.attendance_date || "-"),
                    escapeHTML(`${r.staff?.full_name || "-"} (${r.staff?.staff_id || "-"})`),
                    escapeHTML(r.staff?.branches?.branch_name || "-"),
                    escapeHTML(formatAttendanceTime(r.clock_in)),
                    escapeHTML(formatAttendanceTime(r.clock_out)),
                    badge(r.status),
                    escapeHTML(r.reason || "-"),
                    escapeHTML(r.source || "-"),
                    action
                ];
            })
        );
        document.querySelectorAll('.attendance-approve').forEach(b=>b.onclick=()=>approveAttendance(b.dataset.id));
        document.querySelectorAll('.attendance-edit').forEach(b=>b.onclick=()=>openAttendanceEditor(b.dataset.id, records));
    };
    render();
    document.getElementById("attendanceSearch")?.addEventListener("input", render);
    document.getElementById("attendanceDate")?.addEventListener("change", render);
    document.getElementById("refreshAttendance")?.addEventListener("click", loadAttendanceModule);
}

function formatAttendanceTime(value) {
    if (!value) return "-";
    try { return new Date(value).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}); }
    catch (_) { return value; }
}

async function approveAttendance(id) {
    const { error } = await supabaseClient.from("staff_attendance").update({
        status: "present",
        approved_by: currentStaff.id,
        approved_at: new Date().toISOString()
    }).eq("id", id);
    if (error) { alert(error.message); return; }
    await loadAttendanceModule();
}

async function openAttendanceEditor(id, records) {
    const row = records.find(r => r.id === id);
    if (!row) return;
    const body = `
      <form id="attendanceEditorForm" style="display:grid;gap:12px;">
        <div><strong>${escapeHTML(row.staff?.full_name || '')}</strong> (${escapeHTML(row.staff?.staff_id || '')})</div>
        <label>Date<input id="attDate" type="date" value="${escapeHTML(row.attendance_date || '')}" required></label>
        <label>Clock In<input id="attIn" type="datetime-local" value="${toDateTimeLocal(row.clock_in)}"></label>
        <label>Clock Out<input id="attOut" type="datetime-local" value="${toDateTimeLocal(row.clock_out)}"></label>
        <label>Status<select id="attStatus">
          ${['pending','present','late','absent','leave','missing_time','off_day','rejected'].map(s=>`<option value="${s}" ${row.status===s?'selected':''}>${s.replace('_',' ')}</option>`).join('')}
        </select></label>
        <label>Reason <span style="opacity:.7">(required for Absent, Leave, Missing Time, Rejected, Off Day)</span><textarea id="attReason" rows="3" placeholder="Why was this attendance status recorded?">${escapeHTML(row.reason || '')}</textarea></label>
        <label>Admin note<textarea id="attNotes" rows="2" placeholder="Optional note"></textarea></label>
        <button class="button button-primary" type="submit">Save & Approve</button>
      </form>`;
    const open = window.shekinahCreateCEOActionModal || function(title, content){
      const old=document.getElementById('ceoActionModal'); if(old) old.remove();
      const wrap=document.createElement('div'); wrap.id='ceoActionModal'; wrap.innerHTML=`<div class="modal-overlay" style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45)"><div class="modal-card" style="background:#fff;padding:24px;border-radius:14px;max-width:560px;width:92%;max-height:90vh;overflow:auto"><button onclick="document.getElementById('ceoActionModal').remove()" style="float:right">×</button><h2>${title}</h2>${content}</div></div>`; document.body.appendChild(wrap); };
    open("Review Attendance", body);
    document.getElementById("attendanceEditorForm")?.addEventListener("submit", async e => {
        e.preventDefault();
        const status = document.getElementById("attStatus").value;
        const reason = document.getElementById("attReason").value.trim();
        if (["absent","leave","missing_time","rejected","off_day"].includes(status) && !reason) {
            alert("A reason is required for this attendance status."); return;
        }
        const payload = {
            attendance_date: document.getElementById("attDate").value,
            clock_in: localDateTimeToISO(document.getElementById("attIn").value),
            clock_out: localDateTimeToISO(document.getElementById("attOut").value),
            status,
            reason: reason || null,
            source: "admin",
            approved_by: currentStaff.id,
            approved_at: new Date().toISOString()
        };
        const { error } = await supabaseClient.from("staff_attendance").update(payload).eq("id", id);
        if (error) { alert(error.message); return; }
        document.getElementById("ceoActionModal")?.remove();
        await loadAttendanceModule();
    });
}

function toDateTimeLocal(value) {
    if (!value) return "";
    const d = new Date(value); if (Number.isNaN(d.getTime())) return "";
    const p=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function localDateTimeToISO(value) { return value ? new Date(value).toISOString() : null; }

/* ========================================================
   SUPPLIERS MODULE
======================================================== */

async function loadSuppliersModule() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("suppliers")
            .select(`
                id,
                supplier_name,
                contact_person,
                phone,
                email,
                address,
                supplier_status,
                created_at
            `)
            .order(
                "supplier_name"
            )
            .limit(500);


    if (error) {
        throw error;
    }


    document.getElementById(
        "moduleContent"
    ).innerHTML = `

        <div class="toolbar">

            <input
                class="search-input"
                id="moduleSearch"
                placeholder="Search suppliers..."
            >

            <button
                class="button button-primary"
                id="newSupplierButton"
            >
                + Add Supplier
            </button>

        </div>

        <div id="moduleTable">

            ${renderTable(

                [
                    "Supplier",
                    "Contact",
                    "Phone",
                    "Email",
                    "Address",
                    "Status"
                ],

                (data || []).map(
                    item => [

                        escapeHTML(
                            item.supplier_name
                        ),

                        escapeHTML(
                            item.contact_person || "-"
                        ),

                        escapeHTML(
                            item.phone || "-"
                        ),

                        escapeHTML(
                            item.email || "-"
                        ),

                        escapeHTML(
                            item.address || "-"
                        ),

                        badge(
                            item.supplier_status
                        )

                    ]
                )

            )}

        </div>
    `;


    activateSearch();
}


/* ========================================================
   FINANCE MODULE
======================================================== */

async function loadFinanceModule() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("expenses")
            .select(`
                id,
                expense_number,
                category_id,
                branch_id,
                amount,
                payment_method,
                payment_reference,
                expense_date,
                description,
                receipt_reference,
                expense_status,
                created_at
            `)
            .order(
                "expense_date",
                {
                    ascending: false
                }
            )
            .limit(500);


    if (error) {
        throw error;
    }


    const total =
        (data || [])
            .filter(
                item =>
                    item.expense_status ===
                    "recorded"
            )
            .reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.amount || 0
                    ),
                0
            );


    document.getElementById(
        "moduleContent"
    ).innerHTML = `

        <div class="toolbar">

            <input
                class="search-input"
                id="moduleSearch"
                placeholder="Search expenses..."
            >

            <button
                class="button button-primary"
                id="newExpenseButton"
            >
                + Record Expense
            </button>

        </div>

        <p
            style="
                margin-bottom:15px;
                color:#64748b;
                font-size:12px;
            "
        >
            Recorded expenses:
            <strong>
                ${money(total)}
            </strong>
        </p>

        <div id="moduleTable">

            ${renderTable(

                [
                    "Expense #",
                    "Amount",
                    "Payment",
                    "Date",
                    "Description",
                    "Status"
                ],

                (data || []).map(
                    item => [

                        escapeHTML(
                            item.expense_number
                        ),

                        money(
                            item.amount
                        ),

                        escapeHTML(
                            item.payment_method
                        ),

                        formatDate(
                            item.expense_date
                        ),

                        escapeHTML(
                            item.description || "-"
                        ),

                        badge(
                            item.expense_status
                        )

                    ]
                )

            )}

        </div>
    `;


    activateSearch();
}


/* ========================================================
   REPORTS MODULE
======================================================== */

async function loadReportsModule() {

    const [

        salesResult,

        inventoryResult,

        customerResult,

        branchResult

    ] = await Promise.all([

        supabaseClient
            .from("sales")
            .select(
                "total,sale_status"
            ),

        supabaseClient
            .from("inventory")
            .select(
                "quantity,purchase_price"
            ),

        supabaseClient
            .from("customers")
            .select(
                "current_balance"
            ),

        supabaseClient
            .from("branches")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "status",
                "active"
            )

    ]);


    if (salesResult.error) {
        throw salesResult.error;
    }

    if (inventoryResult.error) {
        throw inventoryResult.error;
    }

    if (customerResult.error) {
        throw customerResult.error;
    }

    if (branchResult.error) {
        throw branchResult.error;
    }


    const sales =
        (salesResult.data || [])
            .filter(
                item =>
                    item.sale_status ===
                    "completed"
            )
            .reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.total || 0
                    ),
                0
            );


    const inventory =
        (inventoryResult.data || [])
            .reduce(
                (sum, item) =>
                    sum +
                    (
                        Number(
                            item.quantity || 0
                        ) *
                        Number(
                            item.purchase_price || 0
                        )
                    ),
                0
            );


    const debt =
        (customerResult.data || [])
            .reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.current_balance || 0
                    ),
                0
            );


    document.getElementById(
        "moduleContent"
    ).innerHTML = `

        <div class="dashboard-grid">

            <div class="stat-card">

                <div class="stat-label">
                    Completed Sales
                </div>

                <div class="stat-value">
                    ${money(sales)}
                </div>

            </div>

            <div class="stat-card">

                <div class="stat-label">
                    Inventory at Cost
                </div>

                <div class="stat-value">
                    ${money(inventory)}
                </div>

            </div>

            <div class="stat-card">

                <div class="stat-label">
                    Customer Debt
                </div>

                <div class="stat-value">
                    ${money(debt)}
                </div>

            </div>

            <div class="stat-card">

                <div class="stat-label">
                    Active Branches
                </div>

                <div class="stat-value">
                    ${branchResult.count || 0}
                </div>

            </div>

        </div>

        <div class="empty">

            Detailed sales, inventory,
            finance and branch reports
            can be expanded from this
            live reporting foundation.

        </div>
    `;
}


/* ========================================================
   NOTIFICATIONS MODULE
======================================================== */

async function loadNotificationsModule() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("notifications")
            .select(`
                id,
                title,
                message,
                notification_type,
                is_read,
                created_at
            `)
            .eq(
                "user_id",
                currentSession.user.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(200);


    if (error) {
        throw error;
    }


    document.getElementById(
        "moduleContent"
    ).innerHTML = `

        <div class="toolbar">

            <button
                class="button button-primary"
                id="markNotificationsRead"
            >
                Mark All as Read
            </button>

        </div>

        <div id="moduleTable">

            ${renderTable(

                [
                    "Title",
                    "Message",
                    "Type",
                    "Status",
                    "Date"
                ],

                (data || []).map(
                    item => [

                        escapeHTML(
                            item.title
                        ),

                        escapeHTML(
                            item.message
                        ),

                        badge(
                            item.notification_type
                        ),

                        item.is_read
                            ? badge("read")
                            : badge("unread"),

                        formatDateTime(
                            item.created_at
                        )

                    ]
                )

            )}

        </div>
    `;


    const button =
        document.getElementById(
            "markNotificationsRead"
        );


    if (button) {

        button.addEventListener(
            "click",
            markNotificationsRead
        );

    }
}


/* ========================================================
   SETTINGS MODULE
======================================================== */

async function loadSettingsModule() {

    document.getElementById(
        "moduleContent"
    ).innerHTML = `

        <div
            style="
                display:grid;
                gap:15px;
                max-width:650px;
            "
        >

            <div class="stat-card">

                <div class="stat-label">
                    Logged-in CEO
                </div>

                <div
                    style="
                        font-weight:800;
                        margin-bottom:5px;
                    "
                >
                    ${escapeHTML(
                        currentStaff.full_name
                    )}
                </div>

                <div class="stat-description">
                    ${escapeHTML(
                        currentStaff.email
                    )}
                </div>

            </div>


            <div class="stat-card">

                <div class="stat-label">
                    Staff ID
                </div>

                <div
                    style="
                        font-weight:800;
                    "
                >
                    ${escapeHTML(
                        currentStaff.staff_id
                    )}
                </div>

            </div>


            <div class="stat-card">

                <div class="stat-label">
                    Role
                </div>

                <div
                    style="
                        font-weight:800;
                    "
                >
                    CEO / Owner
                </div>

            </div>

        </div>
    `;
}


/* ========================================================
   SEARCH
======================================================== */

function activateSearch() {

    const input =
        document.getElementById(
            "moduleSearch"
        );


    const table =
        document.querySelector(
            "#moduleTable tbody"
        );


    if (
        !input ||
        !table
    ) {
        return;
    }


    input.addEventListener(
        "input",
        () => {

            const query =
                input.value
                    .trim()
                    .toLowerCase();


            Array.from(
                table.rows
            ).forEach(row => {

                row.style.display =
                    row.innerText
                        .toLowerCase()
                        .includes(query)
                        ? ""
                        : "none";

            });

        }
    );
}


/* ========================================================
   NOTIFICATION ACTION
======================================================== */

async function markNotificationsRead() {

    const {
        error
    } =
        await supabaseClient
            .from("notifications")
            .update({
                is_read: true
            })
            .eq(
                "user_id",
                currentSession.user.id
            )
            .eq(
                "is_read",
                false
            );


    if (error) {

        alert(
            error.message
        );

        return;
    }


    await loadNotificationsModule();
}


/* ========================================================
   GLOBAL BUTTONS
======================================================== */

function bindGlobalButtons() {

    /*
    Logout
    */

    document
        .getElementById(
            "logoutButton"
        )
        .addEventListener(
            "click",
            logout
        );


    /*
    Refresh current module
    */

    document
        .getElementById(
            "moduleRefresh"
        )
        .addEventListener(
            "click",
            () => {

                if (
                    currentModule ===
                    "dashboard"
                ) {

                    loadDashboard();

                } else {

                    loadModule(
                        currentModule
                    );

                }

            }
        );


    /*
    Mobile menu
    */

    document
        .getElementById(
            "mobileMenuButton"
        )
        .addEventListener(
            "click",
            openMobileSidebar
        );


    document
        .getElementById(
            "sidebarOverlay"
        )
        .addEventListener(
            "click",
            closeMobileSidebar
        );
}


/* ========================================================
   LOGOUT
======================================================== */

async function logout() {

    const confirmed =
        window.confirm(
            "Are you sure you want to sign out?"
        );


    if (!confirmed) {
        return;
    }


    await supabaseClient.auth.signOut();


    window.location.href =
        "index.html";
}


/* ========================================================
   MOBILE SIDEBAR
======================================================== */

function openMobileSidebar() {

    document
        .getElementById(
            "sidebar"
        )
        .classList.add(
            "open"
        );


    document
        .getElementById(
            "sidebarOverlay"
        )
        .classList.add(
            "show"
        );
}


function closeMobileSidebar() {

    document
        .getElementById(
            "sidebar"
        )
        .classList.remove(
            "open"
        );


    document
        .getElementById(
            "sidebarOverlay"
        )
        .classList.remove(
            "show"
        );
}


/* ========================================================
   AUTH STATE LISTENER
======================================================== */

supabaseClient.auth
    .onAuthStateChange(
        (event) => {

            if (
                event ===
                "SIGNED_OUT"
            ) {

                window.location.href =
                    "index.html";
            }

        }
    );


/* ========================================================
   START APPLICATION
======================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeCEO
);

/* ========================================================
   CEO ACTION WORKFLOWS
   These handlers make the module action buttons actually
   create/update records instead of only rendering buttons.
======================================================== */

(function installCEOActionWorkflows() {

    const ACTION_STYLE = `
        .ceo-modal-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:5000;display:flex;align-items:center;justify-content:center;padding:18px}
        .ceo-modal{background:#fff;width:min(720px,100%);max-height:92vh;overflow:auto;border-radius:16px;box-shadow:0 25px 70px rgba(0,0,0,.25)}
        .ceo-modal-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #e5eaf2}
        .ceo-modal-header h3{font-size:18px;margin:0}
        .ceo-modal-close{border:0;background:#f1f5f9;width:34px;height:34px;border-radius:50%;font-size:20px;cursor:pointer}
        .ceo-form{padding:20px;display:grid;gap:14px}
        .ceo-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
        .ceo-field{display:grid;gap:6px}
        .ceo-field.full{grid-column:1/-1}
        .ceo-field label{font-size:12px;font-weight:700;color:#334155}
        .ceo-field input,.ceo-field select,.ceo-field textarea{width:100%;padding:10px 11px;border:1px solid #dbe2ea;border-radius:9px;outline:0;background:#fff}
        .ceo-field textarea{min-height:80px;resize:vertical}
        .ceo-field input:focus,.ceo-field select:focus,.ceo-field textarea:focus{border-color:#173b8f}
        .ceo-form-actions{display:flex;justify-content:flex-end;gap:9px;padding-top:5px}
        .ceo-message{padding:10px 12px;border-radius:9px;font-size:12px;display:none}
        .ceo-message.error{display:block;background:#fee2e2;color:#991b1b}
        .ceo-message.success{display:block;background:#dcfce7;color:#166534}
        .ceo-inline-actions{display:flex;gap:6px;flex-wrap:wrap}
        .ceo-small-button{border:0;border-radius:7px;padding:6px 9px;font-size:11px;font-weight:700;cursor:pointer;background:#edf3ff;color:#173b8f}
        .ceo-small-button.danger{background:#fee2e2;color:#b91c1c}
        @media(max-width:600px){.ceo-form-grid{grid-template-columns:1fr}.ceo-field.full{grid-column:auto}}
    `;

    function injectStyle() {
        if (document.getElementById("ceoActionStyles")) return;
        const style = document.createElement("style");
        style.id = "ceoActionStyles";
        style.textContent = ACTION_STYLE;
        document.head.appendChild(style);
    }

    function modal(title, body) {
        injectStyle();
        const old = document.getElementById("ceoActionModal");
        if (old) old.remove();
        const wrap = document.createElement("div");
        wrap.id = "ceoActionModal";
        wrap.className = "ceo-modal-backdrop";
        wrap.innerHTML = `
            <div class="ceo-modal" role="dialog" aria-modal="true">
                <div class="ceo-modal-header">
                    <h3>${escapeHTML(title)}</h3>
                    <button type="button" class="ceo-modal-close" data-close-ceo-modal>×</button>
                </div>
                ${body}
            </div>`;
        document.body.appendChild(wrap);
        wrap.addEventListener("click", e => {
            if (e.target === wrap || e.target.closest("[data-close-ceo-modal]")) wrap.remove();
        });
        return wrap;
    }

    function formShell(fields, submitText="Save") {
        return `<form class="ceo-form" id="ceoActionForm">
            <div class="ceo-message" id="ceoFormMessage"></div>
            <div class="ceo-form-grid">${fields}</div>
            <div class="ceo-form-actions">
                <button type="button" class="button button-secondary" data-close-ceo-modal>Cancel</button>
                <button type="submit" class="button button-primary">${escapeHTML(submitText)}</button>
            </div>
        </form>`;
    }

    function field(name,label,type="text",opts={}) {
        const required = opts.required === false ? "" : "required";
        const full = opts.full ? " full" : "";
        if (type === "select") {
            return `<div class="ceo-field${full}"><label>${escapeHTML(label)}</label><select name="${escapeHTML(name)}" ${required}>${opts.options || ""}</select></div>`;
        }
        if (type === "textarea") {
            return `<div class="ceo-field${full}"><label>${escapeHTML(label)}</label><textarea name="${escapeHTML(name)}" ${required} placeholder="${escapeHTML(opts.placeholder || "")}">${escapeHTML(opts.value || "")}</textarea></div>`;
        }
        return `<div class="ceo-field${full}"><label>${escapeHTML(label)}</label><input type="${escapeHTML(type)}" name="${escapeHTML(name)}" ${required} ${opts.min != null ? `min="${opts.min}"` : ""} ${opts.step ? `step="${opts.step}"` : ""} value="${escapeHTML(opts.value || "")}" placeholder="${escapeHTML(opts.placeholder || "")}"></div>`;
    }

    function message(form, text, kind="error") {
        const box = form.querySelector("#ceoFormMessage");
        if (!box) return;
        box.className = `ceo-message ${kind}`;
        box.textContent = text;
    }

    function setBusy(form, busy) {
        form.querySelectorAll("button").forEach(b => b.disabled = busy);
        const submit = form.querySelector("button[type=submit]");
        if (submit) submit.textContent = busy ? "Saving..." : "Save";
    }

    function todayISO() {
        return new Date().toISOString().slice(0,10);
    }

    async function optionsFromTable(table, labelField, valueField="id", orderField=labelField, extra="") {
        const {data,error} = await supabaseClient.from(table).select(`id,${labelField}${extra ? `,${extra}` : ""}`).order(orderField);
        if (error) throw error;
        return data || [];
    }

    async function openBranchForm(existing=null) {
        const b = existing || {};
        const modalEl = modal(existing ? "Edit Branch" : "Add Branch", formShell(
            field("branch_code","Branch Code","text",{value:b.branch_code,placeholder:"e.g. LAG-001"}) +
            field("branch_name","Branch Name","text",{value:b.branch_name}) +
            field("address","Address","text",{value:b.address,required:false}) +
            field("city","City","text",{value:b.city || "Lagos"}) +
            field("state","State","text",{value:b.state || "Lagos"}) +
            field("phone","Phone","tel",{value:b.phone,required:false}) +
            field("email","Email","email",{value:b.email,required:false}) +
            field("status","Status","select",{options:`<option value="active" ${b.status !== "inactive" ? "selected" : ""}>Active</option><option value="inactive" ${b.status === "inactive" ? "selected" : ""}>Inactive</option>`})
        , existing ? "Update Branch" : "Add Branch"));
        const form=modalEl.querySelector("form");
        form.addEventListener("submit",async e=>{
            e.preventDefault(); setBusy(form,true);
            const fd=new FormData(form); const payload=Object.fromEntries(fd.entries());
            try {
                const result= existing
                    ? await supabaseClient.from("branches").update(payload).eq("id",existing.id)
                    : await supabaseClient.from("branches").insert(payload);
                if(result.error) throw result.error;
                message(form, existing ? "Branch updated successfully." : "Branch added successfully.","success");
                setTimeout(()=>{modalEl.remove();loadBranchesModule();loadDashboard();},500);
            } catch(err){message(form,err.message||"Unable to save branch.");setBusy(form,false);}
        });
    }

    async function openSupplierForm(existing=null) {
        const s=existing||{};
        const modalEl=modal(existing?"Edit Supplier":"Add Supplier",formShell(
            field("supplier_name","Supplier Name","text",{value:s.supplier_name})+
            field("contact_person","Contact Person","text",{value:s.contact_person,required:false})+
            field("phone","Phone","tel",{value:s.phone,required:false})+
            field("email","Email","email",{value:s.email,required:false})+
            field("address","Address","text",{value:s.address,required:false,full:true})+
            field("supplier_status","Status","select",{options:`<option value="active" ${s.supplier_status!=="inactive"?"selected":""}>Active</option><option value="inactive" ${s.supplier_status==="inactive"?"selected":""}>Inactive</option>`})+
            field("notes","Notes","textarea",{value:s.notes,required:false,full:true})
        ,existing?"Update Supplier":"Add Supplier"));
        const form=modalEl.querySelector("form");
        form.addEventListener("submit",async e=>{
            e.preventDefault();setBusy(form,true);const payload=Object.fromEntries(new FormData(form).entries());
            try{const result=existing?await supabaseClient.from("suppliers").update(payload).eq("id",existing.id):await supabaseClient.from("suppliers").insert(payload);if(result.error)throw result.error;message(form,existing?"Supplier updated successfully.":"Supplier added successfully.","success");setTimeout(()=>{modalEl.remove();loadSuppliersModule();},500);}catch(err){message(form,err.message||"Unable to save supplier.");setBusy(form,false);}
        });
    }

    async function openCustomerForm() {
        const modalEl=modal("Register Customer",formShell(
            field("customer_number","Customer Number","text",{value:`CUS-${Date.now()}`})+
            field("full_name","Full Name")+
            field("phone","Phone","tel",{required:false})+
            field("email","Email","email",{required:false})+
            field("address","Address","text",{required:false})+
            field("credit_limit","Credit Limit","number",{value:"0",min:0,step:"0.01"})+
            field("notes","Notes","textarea",{required:false,full:true})
        ,"Register Customer"));
        const form=modalEl.querySelector("form");
        form.addEventListener("submit",async e=>{e.preventDefault();setBusy(form,true);const payload=Object.fromEntries(new FormData(form).entries());payload.credit_limit=Number(payload.credit_limit||0);payload.current_balance=0;payload.status="active";try{const result=await supabaseClient.from("customers").insert(payload);if(result.error)throw result.error;message(form,"Customer registered successfully.","success");setTimeout(()=>{modalEl.remove();loadCustomersModule();},500);}catch(err){message(form,err.message||"Unable to register customer.");setBusy(form,false);}});
    }

    async function openExpenseForm() {
        const [cats,branches]=await Promise.all([optionsFromTable("expense_categories","category_name"),optionsFromTable("branches","branch_name")]);
        const catOptions=cats.map(x=>`<option value="${x.id}">${escapeHTML(x.category_name)}</option>`).join("");
        const branchOptions=branches.map(x=>`<option value="${x.id}">${escapeHTML(x.branch_name)}</option>`).join("");
        const modalEl=modal("Record Expense",formShell(
            field("category_id","Category","select",{options:catOptions})+
            field("branch_id","Branch","select",{options:branchOptions})+
            field("amount","Amount (₦)","number",{min:0.01,step:"0.01"})+
            field("payment_method","Payment Method","select",{options:`<option value="cash">Cash</option><option value="pos">POS</option><option value="bank_transfer">Bank Transfer</option><option value="mobile_money">Mobile Money</option><option value="other">Other</option>`})+
            field("payment_reference","Payment Reference","text",{required:false})+
            field("expense_date","Expense Date","date",{value:todayISO()})+
            field("description","Description","textarea",{required:false,full:true})+
            field("receipt_reference","Receipt Reference","text",{required:false})
        ,"Record Expense"));
        const form=modalEl.querySelector("form");
        form.addEventListener("submit",async e=>{e.preventDefault();setBusy(form,true);const p=Object.fromEntries(new FormData(form).entries());p.amount=Number(p.amount);p.recorded_by=currentStaff.id;p.expense_number=`EXP-${Date.now()}`;p.expense_status="recorded";try{const result=await supabaseClient.from("expenses").insert(p);if(result.error)throw result.error;message(form,"Expense recorded successfully.","success");setTimeout(()=>{modalEl.remove();loadFinanceModule();},500);}catch(err){message(form,err.message||"Unable to record expense.");setBusy(form,false);}});
    }

    async function openStockPurchaseForm() {
        const [suppliers,branches]=await Promise.all([optionsFromTable("suppliers","supplier_name"),optionsFromTable("branches","branch_name")]);
        const supplierOptions=suppliers.map(x=>`<option value="${x.id}">${escapeHTML(x.supplier_name)}</option>`).join("");
        const branchOptions=branches.map(x=>`<option value="${x.id}">${escapeHTML(x.branch_name)}</option>`).join("");
        const modalEl=modal("Receive Stock / New Purchase",`
            <form class="ceo-form" id="ceoPurchaseForm">
              <div class="ceo-message" id="ceoFormMessage"></div>
              <div class="ceo-form-grid">
                ${field("supplier_id","Supplier","select",{options:supplierOptions})}
                ${field("branch_id","Branch","select",{options:branchOptions})}
                ${field("supplier_invoice_number","Supplier Invoice #","text",{required:false})}
                ${field("discount","Discount (₦)","number",{value:"0",min:0,step:"0.01"})}
                ${field("tax","Tax (₦)","number",{value:"0",min:0,step:"0.01"})}
                ${field("notes","Notes","textarea",{required:false,full:true})}
                <div class="ceo-field full"><label>Items</label>
                  <div id="purchaseItems" style="display:grid;gap:8px"></div>
                  <button type="button" class="button button-secondary" id="addPurchaseItem">+ Add Item</button>
                </div>
              </div>
              <div class="ceo-form-actions"><button type="button" class="button button-secondary" data-close-ceo-modal>Cancel</button><button type="submit" class="button button-primary">Create & Receive Stock</button></div>
            </form>`);
        const form=modalEl.querySelector("form"); const itemsBox=form.querySelector("#purchaseItems");
        function addItem(){
            const row=document.createElement("div");row.style.cssText="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr auto;gap:6px;align-items:end";
            row.innerHTML=`<input name="product_name" required placeholder="Product name"><input name="batch_number" placeholder="Batch"><input name="quantity" type="number" min="1" step="1" required placeholder="Qty"><input name="purchase_price" type="number" min="0" step="0.01" required placeholder="Cost"><input name="selling_price" type="number" min="0" step="0.01" required placeholder="Selling"><button type="button" class="button button-danger remove-purchase-item">×</button>`;
            row.querySelector(".remove-purchase-item").onclick=()=>row.remove();itemsBox.appendChild(row);
        }
        form.querySelector("#addPurchaseItem").onclick=addItem;addItem();
        form.addEventListener("submit",async e=>{e.preventDefault();setBusy(form,true);const fd=new FormData(form);const rows=[...itemsBox.children].map(row=>{const f=new FormData();row.querySelectorAll("input").forEach(i=>f.append(i.name,i.value));return Object.fromEntries(f.entries());}).filter(x=>x.product_name);if(!rows.length){message(form,"Add at least one purchase item.");setBusy(form,false);return;}const payload={supplier_id:fd.get("supplier_id"),branch_id:fd.get("branch_id"),supplier_invoice_number:fd.get("supplier_invoice_number")||null,discount:Number(fd.get("discount")||0),tax:Number(fd.get("tax")||0),notes:fd.get("notes")||null,p_items:rows.map(x=>({product_name:x.product_name,batch_number:x.batch_number||null,quantity:Number(x.quantity),purchase_price:Number(x.purchase_price),selling_price:Number(x.selling_price),expiry_date:null}))};try{const {data,error}=await supabaseClient.rpc("create_purchase",payload);if(error)throw error;const purchaseId=data?.purchase_id||data?.id;if(!purchaseId)throw new Error("Purchase was created but its ID was not returned.");const receive=await supabaseClient.rpc("receive_purchase",{p_purchase_id:purchaseId});if(receive.error)throw receive.error;message(form,"Purchase created and stock received successfully.","success");setTimeout(()=>{modalEl.remove();loadPurchasesModule();loadInventoryModule();},600);}catch(err){message(form,err.message||"Unable to create purchase.");setBusy(form,false);}});
    }

    async function openSaleForm() {
        const [branches,inventory,customers]=await Promise.all([
            optionsFromTable("branches","branch_name"),
            supabaseClient.from("inventory").select("id,product_name,batch_number,selling_price,quantity,branch_id,status").eq("status","active").gt("quantity",0).order("product_name").then(r=>{if(r.error)throw r.error;return r.data||[]}),
            supabaseClient.from("customers").select("id,customer_number,full_name,current_balance,status").eq("status","active").order("full_name").then(r=>{if(r.error)throw r.error;return r.data||[]})
        ]);
        const branchOptions=branches.map(x=>`<option value="${x.id}">${escapeHTML(x.branch_name)}</option>`).join("");
        const customerOptions=`<option value="">Walk-in customer</option>`+customers.map(x=>`<option value="${x.id}">${escapeHTML(x.full_name)} — ${escapeHTML(x.customer_number)}</option>`).join("");
        const productOptions=`<option value="">Select product</option>`+inventory.map(x=>`<option value="${x.id}" data-price="${Number(x.selling_price||0)}" data-stock="${Number(x.quantity||0)}">${escapeHTML(x.product_name)}${x.batch_number?` — ${escapeHTML(x.batch_number)}`:""} (₦${Number(x.selling_price||0).toLocaleString("en-NG")}, stock ${x.quantity})</option>`).join("");
        const modalEl=modal("New Sale / POS",`
          <form class="ceo-form" id="ceoSaleForm">
            <div class="ceo-message" id="ceoFormMessage"></div>
            <div class="ceo-form-grid">
              ${field("branch_id","Branch","select",{options:branchOptions})}
              ${field("customer_id","Customer","select",{options:customerOptions,required:false})}
              <div class="ceo-field full"><label>Product</label><select id="saleProduct">${productOptions}</select></div>
              ${field("quantity","Quantity","number",{value:"1",min:1,step:"1"})}
              ${field("unit_price","Unit Price (₦)","number",{min:0,step:"0.01"})}
              ${field("discount","Discount (₦)","number",{value:"0",min:0,step:"0.01"})}
              ${field("tax","Tax (₦)","number",{value:"0",min:0,step:"0.01"})}
              ${field("payment_method","Payment Method","select",{options:`<option value="cash">Cash</option><option value="pos">POS</option><option value="bank_transfer">Bank Transfer</option><option value="mobile_money">Mobile Money</option><option value="other">Other</option>`})}
              ${field("payment_amount","Amount Paid (₦)","number",{min:0,step:"0.01"})}
              ${field("payment_reference","Payment Reference","text",{required:false})}
              <div class="ceo-field full"><label>Calculated Total</label><div id="saleTotal" style="font-size:20px;font-weight:800;color:#173b8f">₦0</div></div>
            </div>
            <div class="ceo-form-actions"><button type="button" class="button button-secondary" data-close-ceo-modal>Cancel</button><button type="submit" class="button button-primary">Complete Sale</button></div>
          </form>`);
        const form=modalEl.querySelector("form"), product=form.querySelector("#saleProduct"), qty=form.querySelector('[name="quantity"]'), price=form.querySelector('[name="unit_price"]'), discount=form.querySelector('[name="discount"]'), tax=form.querySelector('[name="tax"]'), paid=form.querySelector('[name="payment_amount"]'), totalBox=form.querySelector("#saleTotal");
        function calc(){const total=Math.max(0,Number(qty.value||0)*Number(price.value||0)-Number(discount.value||0)+Number(tax.value||0));totalBox.textContent=money(total);if(!paid.value)paid.value=total;}
        product.addEventListener("change",()=>{const o=product.selectedOptions[0];price.value=o?.dataset.price||"";qty.max=o?.dataset.stock||"";calc();});[qty,price,discount,tax,paid].forEach(x=>x.addEventListener("input",calc));
        form.addEventListener("submit",async e=>{e.preventDefault();setBusy(form,true);const fd=new FormData(form);const inventoryId=product.value;if(!inventoryId){message(form,"Select a product.");setBusy(form,false);return;}const inv=inventory.find(x=>x.id===inventoryId);if(!inv){message(form,"Selected product is no longer available.");setBusy(form,false);return;}const q=Number(fd.get("quantity")),up=Number(fd.get("unit_price")),disc=Number(fd.get("discount")||0),tx=Number(fd.get("tax")||0),sub=Math.max(0,q*up-disc),total=Math.max(0,sub+tx),amount=Number(fd.get("payment_amount")||0);if(q<=0||q>Number(inv.quantity)){message(form,`Quantity exceeds available stock (${inv.quantity}).`);setBusy(form,false);return;}if(inv.branch_id!==fd.get("branch_id")){message(form,"The selected product belongs to a different branch. Select the product's branch or another product.");setBusy(form,false);return;}if(amount<total&&!fd.get("customer_id")){message(form,"A customer account is required for a credit/partial sale.");setBusy(form,false);return;}try{const sale={sale_number:`SALE-${Date.now()}`,branch_id:fd.get("branch_id"),staff_id:currentStaff.id,customer_id:fd.get("customer_id")||null,subtotal:sub,discount:0,tax:tx,total,amount_paid:0,balance_due:0,change_given:0,payment_status:"pending",sale_status:"pending"};const created=await supabaseClient.from("sales").insert(sale).select("id").single();if(created.error)throw created.error;const item=await supabaseClient.from("sale_items").insert({sale_id:created.data.id,inventory_id:inv.id,product_name:inv.product_name,quantity:q,unit_price:up,discount:disc,line_total:Math.max(0,q*up-disc)});if(item.error)throw item.error;const completed=await supabaseClient.rpc("complete_pos_sale",{p_sale_id:created.data.id,p_payment_method:fd.get("payment_method"),p_payment_amount:amount,p_payment_reference:fd.get("payment_reference")||null});if(completed.error)throw completed.error;message(form,"Sale completed successfully.","success");setTimeout(()=>{modalEl.remove();loadSalesModule();loadInventoryModule();loadDashboard();},600);}catch(err){message(form,err.message||"Unable to complete sale.");setBusy(form,false);}});
    }


    async function openStaffForm() {
        const [roles,branches]=await Promise.all([optionsFromTable("roles","role_name"),optionsFromTable("branches","branch_name")]);
        const roleOptions=roles.map(x=>`<option value="${x.id}">${escapeHTML(x.role_name)}</option>`).join("");
        const branchOptions=branches.map(x=>`<option value="${x.id}">${escapeHTML(x.branch_name)}</option>`).join("");
        const modalEl=modal("Add Staff Profile",formShell(
            field("staff_id","Staff ID","text",{value:`STF-${Date.now()}`})+
            field("full_name","Full Name")+
            field("email","Email","email")+
            field("phone","Phone","tel",{required:false})+
            field("role_id","Role","select",{options:roleOptions})+
            field("branch_id","Branch","select",{options:branchOptions})+
            field("department","Department","text",{required:false})+
            field("job_title","Job Title","text",{required:false})+
            field("salary","Salary (₦)","number",{value:"0",min:0,step:"0.01"})+
            field("date_joined","Date Joined","date",{value:todayISO()})+
            field("employment_status","Employment Status","select",{options:`<option value="active">Active</option><option value="on_leave">On Leave</option><option value="terminated">Terminated</option>`})+
            field("account_status","Account Status","select",{options:`<option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>`})
        ,"Create Staff Profile"));
        const form=modalEl.querySelector("form");
        form.addEventListener("submit",async e=>{e.preventDefault();setBusy(form,true);const p=Object.fromEntries(new FormData(form).entries());p.salary=Number(p.salary||0);try{const r=await supabaseClient.from("staff").insert(p);if(r.error)throw r.error;message(form,"Staff profile created. A login account must be linked separately through the secure authentication/invite process.","success");setTimeout(()=>{modalEl.remove();loadStaffModule();},900);}catch(err){message(form,err.message||"Unable to create staff profile.");setBusy(form,false);}});
    }

    async function openDebtPayment(customerId, customerName, balance) {
        const modalEl=modal(`Debt Payment — ${customerName}`,formShell(
            field("amount","Payment Amount (₦)","number",{min:0.01,max:balance,step:"0.01"})+
            field("payment_method","Payment Method","select",{options:`<option value="cash">Cash</option><option value="pos">POS</option><option value="bank_transfer">Bank Transfer</option><option value="mobile_money">Mobile Money</option><option value="other">Other</option>`})+
            field("payment_reference","Reference","text",{required:false})+
            field("description","Description","textarea",{required:false,full:true})
        ,"Record Payment"));
        const form=modalEl.querySelector("form");
        form.addEventListener("submit",async e=>{e.preventDefault();setBusy(form,true);const fd=new FormData(form);try{const result=await supabaseClient.rpc("record_customer_debt_payment",{p_customer_id:customerId,p_amount:Number(fd.get("amount")),p_payment_method:fd.get("payment_method"),p_payment_reference:fd.get("payment_reference")||null,p_description:fd.get("description")||null});if(result.error)throw result.error;message(form,"Debt payment recorded successfully.","success");setTimeout(()=>{modalEl.remove();loadCustomersModule();loadDashboard();},500);}catch(err){message(form,err.message||"Unable to record debt payment.");setBusy(form,false);}});
    }

    async function editCustomer(id) {
        const {data,error}=await supabaseClient.from("customers").select("*").eq("id",id).single();if(error)throw error;const c=data;
        const modalEl=modal("Edit Customer",formShell(
            field("full_name","Full Name", "text",{value:c.full_name})+
            field("phone","Phone","tel",{value:c.phone,required:false})+
            field("email","Email","email",{value:c.email,required:false})+
            field("address","Address","text",{value:c.address,required:false})+
            field("credit_limit","Credit Limit","number",{value:c.credit_limit,min:0,step:"0.01"})+
            field("status","Status","select",{options:`<option value="active" ${c.status==="active"?"selected":""}>Active</option><option value="inactive" ${c.status==="inactive"?"selected":""}>Inactive</option><option value="blocked" ${c.status==="blocked"?"selected":""}>Blocked</option>`})+
            field("notes","Notes","textarea",{value:c.notes,required:false,full:true})
        ,"Update Customer"));
        const form=modalEl.querySelector("form");form.addEventListener("submit",async e=>{e.preventDefault();setBusy(form,true);const p=Object.fromEntries(new FormData(form).entries());p.credit_limit=Number(p.credit_limit||0);try{const r=await supabaseClient.from("customers").update(p).eq("id",id);if(r.error)throw r.error;message(form,"Customer updated successfully.","success");setTimeout(()=>{modalEl.remove();loadCustomersModule();},500);}catch(err){message(form,err.message||"Unable to update customer.");setBusy(form,false);}});
    }

    async function editBranch(id) { const {data,error}=await supabaseClient.from("branches").select("*").eq("id",id).single(); if(error)throw error; openBranchForm(data); }
    async function editSupplier(id) { const {data,error}=await supabaseClient.from("suppliers").select("*").eq("id",id).single(); if(error)throw error; openSupplierForm(data); }

    async function deactivate(table,id,label){if(!confirm(`Deactivate this ${label}?`))return;const payload=table==="branches"?{status:"inactive"}:{supplier_status:"inactive"};const r=await supabaseClient.from(table).update(payload).eq("id",id);if(r.error)alert(r.error.message);else if(table==="branches")loadBranchesModule();else loadSuppliersModule();}

    function installClickDelegation(){
        document.addEventListener("click",async e=>{
            const id=e.target.closest("button")?.id;
            if(!id)return;
            try{
                if(id==="newBranchButton"){await openBranchForm();return;}
                if(id==="newSupplierButton"){await openSupplierForm();return;}
                if(id==="newCustomerButton"){await openCustomerForm();return;}
                if(id==="newExpenseButton"){await openExpenseForm();return;}
                if(id==="newInventoryButton"||id==="newPurchaseButton"){await openStockPurchaseForm();return;}
                if(id==="newSaleButton"){await openSaleForm();return;}
                if(id==="newStaffButton"){await openStaffForm();return;}
            }catch(err){alert(err.message||"Unable to open this action.");}
        });
    }

    function decorateTables(){
        document.addEventListener("click",async e=>{
            const btn=e.target.closest("[data-ceo-action]");if(!btn)return;
            const action=btn.dataset.ceoAction,id=btn.dataset.id;
            try{
                if(action==="edit-branch")await editBranch(id);
                if(action==="deactivate-branch")await deactivate("branches",id,"branch");
                if(action==="edit-supplier")await editSupplier(id);
                if(action==="deactivate-supplier")await deactivate("suppliers",id,"supplier");
                if(action==="edit-customer")await editCustomer(id);
                if(action==="pay-debt")await openDebtPayment(id,btn.dataset.name||"Customer",Number(btn.dataset.balance||0));
            }catch(err){alert(err.message||"Action failed.");}
        });
    }

    function patchModuleButtons(){
        const observer=new MutationObserver(()=>{
            if(currentModule==="branches"){
                const table=document.querySelector("#moduleTable table");
                if(table&&!table.querySelector(".ceo-actions-head")){
                    table.querySelector("thead tr")?.insertAdjacentHTML("beforeend",`<th class="ceo-actions-head">Actions</th>`);
                    table.querySelectorAll("tbody tr").forEach((tr,i)=>{
                        const text=tr.children[0]?.textContent.trim();
                        const buttons=window.__ceoBranchRows||[]; const row=buttons.find(x=>String(x.branch_code)===text);
                        if(row)tr.insertAdjacentHTML("beforeend",`<td><div class="ceo-inline-actions"><button class="ceo-small-button" data-ceo-action="edit-branch" data-id="${row.id}">Edit</button><button class="ceo-small-button danger" data-ceo-action="deactivate-branch" data-id="${row.id}">Deactivate</button></div></td>`);
                    });
                }
            }
            if(currentModule==="suppliers"){
                const table=document.querySelector("#moduleTable table");if(table&&!table.querySelector(".ceo-actions-head")){table.querySelector("thead tr")?.insertAdjacentHTML("beforeend",`<th class="ceo-actions-head">Actions</th>`);(window.__ceoSupplierRows||[]).forEach(row=>{});table.querySelectorAll("tbody tr").forEach(tr=>{const name=tr.children[0]?.textContent.trim();const row=(window.__ceoSupplierRows||[]).find(x=>x.supplier_name===name);if(row)tr.insertAdjacentHTML("beforeend",`<td><div class="ceo-inline-actions"><button class="ceo-small-button" data-ceo-action="edit-supplier" data-id="${row.id}">Edit</button><button class="ceo-small-button danger" data-ceo-action="deactivate-supplier" data-id="${row.id}">Deactivate</button></div></td>`);});}
            }
            if(currentModule==="customers"){
                const table=document.querySelector("#moduleTable table");if(table&&!table.querySelector(".ceo-actions-head")){table.querySelector("thead tr")?.insertAdjacentHTML("beforeend",`<th class="ceo-actions-head">Actions</th>`);table.querySelectorAll("tbody tr").forEach(tr=>{const number=tr.children[0]?.textContent.trim();const row=(window.__ceoCustomerRows||[]).find(x=>x.customer_number===number);if(row)tr.insertAdjacentHTML("beforeend",`<td><div class="ceo-inline-actions"><button class="ceo-small-button" data-ceo-action="edit-customer" data-id="${row.id}">Edit</button>${Number(row.current_balance||0)>0?`<button class="ceo-small-button" data-ceo-action="pay-debt" data-id="${row.id}" data-name="${escapeHTML(row.full_name)}" data-balance="${row.current_balance}">Pay Debt</button>`:""}</div></td>`);});}
            }
        });
        observer.observe(document.getElementById("moduleContent")||document.body,{childList:true,subtree:true});
    }

    /* Capture row data from the existing loaders without redesigning them. */
    const originalLoadBranches=window.loadBranchesModule;
    const originalLoadSuppliers=window.loadSuppliersModule;
    const originalLoadCustomers=window.loadCustomersModule;
    /* Function declarations are lexical; the loaders above remain the canonical data loaders.
       We therefore capture data through small background queries before decoration. */
    async function refreshActionRows(){
        try{
            const [b,s,c]=await Promise.all([
                supabaseClient.from("branches").select("id,branch_code,branch_name,status").order("branch_name"),
                supabaseClient.from("suppliers").select("id,supplier_name,supplier_status").order("supplier_name"),
                supabaseClient.from("customers").select("id,customer_number,full_name,current_balance").order("full_name")
            ]);
            if(!b.error)window.__ceoBranchRows=b.data||[];
            if(!s.error)window.__ceoSupplierRows=s.data||[];
            if(!c.error)window.__ceoCustomerRows=c.data||[];
        }catch(_){ }
    }

    document.addEventListener("DOMContentLoaded",async()=>{
        injectStyle();
        installClickDelegation();
        decorateTables();
        await refreshActionRows();
        patchModuleButtons();
        setInterval(refreshActionRows,30000);
        setInterval(()=>{
            const content=document.getElementById("moduleContent");
            if(!content) return;
            const table=content.querySelector("#moduleTable table");
            if(!table || table.querySelector(".ceo-actions-head")) return;
            if(currentModule==="branches" || currentModule==="suppliers" || currentModule==="customers") {
                table.querySelector("thead tr")?.insertAdjacentHTML("beforeend",`<th class="ceo-actions-head">Actions</th>`);
                table.querySelectorAll("tbody tr").forEach(tr=>{
                    if(tr.querySelector("[data-ceo-action]")) return;
                    let row=null, action1="", action2="", id="";
                    if(currentModule==="branches"){row=(window.__ceoBranchRows||[]).find(x=>x.branch_code===tr.children[0]?.textContent.trim());action1="edit-branch";action2="deactivate-branch";}
                    if(currentModule==="suppliers"){row=(window.__ceoSupplierRows||[]).find(x=>x.supplier_name===tr.children[0]?.textContent.trim());action1="edit-supplier";action2="deactivate-supplier";}
                    if(currentModule==="customers"){row=(window.__ceoCustomerRows||[]).find(x=>x.customer_number===tr.children[0]?.textContent.trim());action1="edit-customer";action2="pay-debt";}
                    if(!row)return; id=row.id;
                    const second=currentModule==="customers" ? (Number(row.current_balance||0)>0?`<button class="ceo-small-button" data-ceo-action="pay-debt" data-id="${id}" data-name="${escapeHTML(row.full_name)}" data-balance="${row.current_balance}">Pay Debt</button>`:`<span style="font-size:11px;color:#94a3b8">No debt</span>`) : `<button class="ceo-small-button danger" data-ceo-action="${action2}" data-id="${id}">${currentModule==="branches"||currentModule==="suppliers"?"Deactivate":""}</button>`;
                    tr.insertAdjacentHTML("beforeend",`<td><div class="ceo-inline-actions"><button class="ceo-small-button" data-ceo-action="${action1}" data-id="${id}">Edit</button>${second}</div></td>`);
                });
            }
        },500);
    });

})();
