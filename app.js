/**
 * 家庭财务管理工具 - 主应用逻辑
 * 数据存储：IndexedDB (via localForage)
 */

// ==================== 数据存储配置 ====================
const DB_CONFIG = {
    name: 'FamilyFinanceDB',
    version: 1
};

// 数据存储键
const STORE_KEYS = {
    CASH: 'cash_assets',
    DEPOSIT: 'deposits',
    PROVIDENT: 'provident_fund',
    STOCKS_A: 'stocks_a',
    STOCKS_B: 'stocks_b',
    CURRENCY: 'currency_invest',
    FUNDS: 'funds',
    WEALTH: 'wealth_products',
    GOLD: 'gold_assets',
    PHYSICAL: 'physical_assets',
    DEBT: 'debts',
    INSURANCE: 'insurance',
    EXPENSE: 'expenses',
    HISTORY: 'net_worth_history',
    SETTINGS: 'settings',
    SNAPSHOTS: 'net_worth_snapshots',  // 净资产快照历史
    MONTHLY_EXPENSE: 'monthly_rigid_expense'  // 每月刚性必要支出
};

// 初始化存储
localforage.config({
    name: DB_CONFIG.name,
    version: DB_CONFIG.version
});

// ==================== 全局状态 ====================
let currentPage = 'dashboard';
let editingId = null;
let editingType = null;
let currentInvestTab = 'stocks'; // 投资页面的当前子页签
let currentAssetsTab = 'cash'; // 资产页面的当前子页签 (cash, stable, physical)

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', async () => {
    initNavigation();
    await loadPage('dashboard');
    updateLastUpdateTime();
});

// ==================== 导航 ====================
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            loadPage(page);
        });
    });
}

async function loadPage(page) {
    currentPage = page;
    const content = document.getElementById('page-content');
    const title = document.getElementById('page-title');
    const addBtn = document.getElementById('header-add-btn');
    
    // 总览看板、资产管理、投资理财隐藏顶部新增按钮（这两页的新增按钮放在页签下）
    if (addBtn) {
        const hidePages = ['dashboard', 'assets', 'investment'];
        addBtn.style.display = hidePages.includes(page) ? 'none' : 'inline-block';
    }
    
    switch(page) {
        case 'dashboard':
            title.textContent = '财务总览';
            content.innerHTML = await renderDashboard();
            break;
        case 'assets':
            title.textContent = '资产管理';
            content.innerHTML = await renderAssetsPage();
            break;
        case 'investment':
            title.textContent = '投资理财';
            content.innerHTML = await renderInvestmentPage();
            break;
        case 'liabilities':
            title.textContent = '负债管理';
            content.innerHTML = await renderLiabilitiesPage();
            break;
        case 'insurance':
            title.textContent = '保险管理';
            content.innerHTML = await renderInsurancePage();
            break;
        case 'expense':
            title.textContent = '消费记录';
            content.innerHTML = await renderExpensePage();
            break;
        case 'analysis':
            title.textContent = '财务分析';
            content.innerHTML = await renderAnalysisPage();
            break;
    }
}

// ==================== 数据获取 ====================
async function getAllData() {
    const data = {};
    for (const key of Object.values(STORE_KEYS)) {
        data[key] = await localforage.getItem(key) || [];
    }
    return data;
}

async function getData(key) {
    return await localforage.getItem(key) || [];
}

async function saveData(key, data) {
    await localforage.setItem(key, data);
    updateLastUpdateTime();
}

// ==================== 计算统计 ====================
async function calculateStats() {
    const data = await getAllData();
    
    // 现金类流动资产
    const cashTotal = data[STORE_KEYS.CASH].reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // 稳健资产
    const depositTotal = data[STORE_KEYS.DEPOSIT].reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const providentTotal = data[STORE_KEYS.PROVIDENT].reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const stableTotal = depositTotal + providentTotal;
    
    // 投资资产
    const stocksATotal = data[STORE_KEYS.STOCKS_A].reduce((sum, item) => sum + (parseFloat(item.marketValue) || 0), 0);
    const stocksBTotal = data[STORE_KEYS.STOCKS_B].reduce((sum, item) => sum + (parseFloat(item.marketValue) || 0), 0);
    const currencyTotal = data[STORE_KEYS.CURRENCY].reduce((sum, item) => sum + (parseFloat(item.cnyValue) || 0), 0);
    
    // 基金和理财产品 - 按平台分组统计
    const funds = data[STORE_KEYS.FUNDS] || [];
    const fundsBankTotal = funds.filter(i => i.platform === 'bank').reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const fundsAlipayTotal = funds.filter(i => i.platform === 'alipay').reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    const wealth = data[STORE_KEYS.WEALTH] || [];
    const wealthBankTotal = wealth.filter(i => i.platform === 'bank').reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const wealthAlipayTotal = wealth.filter(i => i.platform === 'alipay').reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    const goldTotal = data[STORE_KEYS.GOLD].reduce((sum, item) => sum + (parseFloat(item.cnyValue) || 0), 0);
    const investTotal = stocksATotal + stocksBTotal + currencyTotal + fundsBankTotal + fundsAlipayTotal + 
                        wealthBankTotal + wealthAlipayTotal + goldTotal;
    
    // 实物资产
    const physicalTotal = data[STORE_KEYS.PHYSICAL].reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
    
    // 负债
    const debtTotal = data[STORE_KEYS.DEBT].reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // 总资产和净资产
    const totalAssets = cashTotal + stableTotal + investTotal + physicalTotal;
    const netWorth = totalAssets - debtTotal;
    
    // 计算增长率
    const history = data[STORE_KEYS.HISTORY] || [];
    let growthRate = 0;
    if (history.length >= 2) {
        const lastMonth = history[history.length - 2]?.netWorth || netWorth;
        growthRate = lastMonth > 0 ? ((netWorth - lastMonth) / lastMonth * 100) : 0;
    }
    
    // 抗风险能力（现金+稳健资产 / 月支出，假设月支出为最近3个月平均）
    const expenses = data[STORE_KEYS.EXPENSE];
    const avgMonthlyExpense = expenses.length > 0 
        ? expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0) / Math.max(expenses.length / 30, 1)
        : 0;
    const riskResistance = avgMonthlyExpense > 0 ? (cashTotal + stableTotal) / avgMonthlyExpense : 999;
    
    return {
        cashTotal,
        stableTotal,
        depositTotal,
        providentTotal,
        investTotal,
        stocksATotal,
        stocksBTotal,
        currencyTotal,
        fundsTotal: fundsBankTotal + fundsAlipayTotal,
        wealthTotal: wealthBankTotal + wealthAlipayTotal,
        goldTotal,
        physicalTotal,
        debtTotal,
        totalAssets,
        netWorth,
        growthRate,
        riskResistance,
        expenseTotal: expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
    };
}

// ==================== 渲染页面 ====================

// 总览看板
async function renderDashboard() {
    const stats = await calculateStats();
    
    // 记录净资产历史
    await recordNetWorthHistory(stats.netWorth);
    
    const assetAllocation = {
        labels: ['现金流动', '稳健资产', '投资理财', '实物资产'],
        data: [stats.cashTotal, stats.stableTotal, stats.investTotal, stats.physicalTotal],
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
    };
    
    // 投资理财占比数据
    const investAllocation = {
        labels: ['A股', 'B股', '货币理财', '基金', '理财产品', '贵金属'],
        data: [stats.stocksATotal, stats.stocksBTotal, stats.currencyTotal, stats.fundsTotal, stats.wealthTotal, stats.goldTotal],
        colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#eab308']
    };

    setTimeout(() => {
        renderPieChart('asset-allocation-chart', assetAllocation);
        renderPieChart('invest-allocation-chart', investAllocation);
        renderNetWorthChart();
    }, 100);
    
    return `
        <div class="card-grid">
            <div class="card">
                <div class="card-header">
                    <span class="card-title">净资产</span>
                </div>
                <div class="card-value">¥${formatNumber(stats.netWorth)}</div>
                <span class="card-change ${stats.growthRate >= 0 ? 'positive' : 'negative'}">
                    ${stats.growthRate >= 0 ? '↑' : '↓'} ${Math.abs(stats.growthRate).toFixed(2)}%
                </span>
            </div>
            <div class="card">
                <div class="card-header">
                    <span class="card-title">总资产</span>
                </div>
                <div class="card-value">¥${formatNumber(stats.totalAssets)}</div>
            </div>
            <div class="card">
                <div class="card-header">
                    <span class="card-title">总负债</span>
                </div>
                <div class="card-value">¥${formatNumber(stats.debtTotal)}</div>
                <div style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
                    负债率: ${stats.totalAssets > 0 ? (stats.debtTotal / stats.totalAssets * 100).toFixed(1) : 0}%
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <span class="card-title">抗风险能力</span>
                </div>
                <div class="card-value">${stats.riskResistance < 999 ? stats.riskResistance.toFixed(1) : '∞'}</div>
                <div style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
                    ${getRiskLevelText(stats.riskResistance)}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${getRiskLevel(stats.riskResistance)}" 
                         style="width: ${Math.min(stats.riskResistance / 12 * 100, 100)}%"></div>
                </div>
            </div>
        </div>
        
        <div class="chart-row">
            <div class="chart-container asset-chart-small">
                <div class="chart-title">资产分布</div>
                <canvas id="asset-allocation-chart"></canvas>
            </div>
            <div class="chart-container asset-chart-small">
                <div class="chart-title">投资理财占比</div>
                <canvas id="invest-allocation-chart"></canvas>
            </div>
            <div class="chart-container">
                <div class="chart-header">
                    <div class="chart-title">净资产趋势</div>
                    <button class="btn-snapshot" onclick="takeNetWorthSnapshot()">资产快照</button>
                </div>
                <canvas id="net-worth-chart"></canvas>
            </div>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">各类资产占比</div>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-label">现金流动资产</div>
                    <div class="metric-value ${getPercentageClass(stats.cashTotal, stats.totalAssets)}">
                        ${stats.totalAssets > 0 ? (stats.cashTotal / stats.totalAssets * 100).toFixed(1) : 0}%
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">¥${formatNumber(stats.cashTotal)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">稳健资产</div>
                    <div class="metric-value ${getPercentageClass(stats.stableTotal, stats.totalAssets)}">
                        ${stats.totalAssets > 0 ? (stats.stableTotal / stats.totalAssets * 100).toFixed(1) : 0}%
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">¥${formatNumber(stats.stableTotal)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">投资理财</div>
                    <div class="metric-value ${getPercentageClass(stats.investTotal, stats.totalAssets)}">
                        ${stats.totalAssets > 0 ? (stats.investTotal / stats.totalAssets * 100).toFixed(1) : 0}%
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">¥${formatNumber(stats.investTotal)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">实物资产</div>
                    <div class="metric-value ${getPercentageClass(stats.physicalTotal, stats.totalAssets)}">
                        ${stats.totalAssets > 0 ? (stats.physicalTotal / stats.totalAssets * 100).toFixed(1) : 0}%
                    </div>
                    <div style="font-size: 13px; color: var(--text-secondary);">¥${formatNumber(stats.physicalTotal)}</div>
                </div>
            </div>
        </div>
    `;
}

// 资产管理页面
async function renderAssetsPage() {
    const data = await getAllData();
    const stats = await calculateStats();
    
    // 排序存款（按到期时间从近到远）
    const sortedDeposits = [...data[STORE_KEYS.DEPOSIT]].sort((a, b) => 
        new Date(a.dueDate) - new Date(b.dueDate)
    );
    
    return `
        <div class="tabs">
            <div class="tab ${currentAssetsTab === 'cash' ? 'active' : ''}" onclick="switchAssetTab(this, 'cash')">现金资产</div>
            <div class="tab ${currentAssetsTab === 'stable' ? 'active' : ''}" onclick="switchAssetTab(this, 'stable')">稳健资产</div>
            <div class="tab ${currentAssetsTab === 'physical' ? 'active' : ''}" onclick="switchAssetTab(this, 'physical')">实物资产</div>
        </div>
        
        <div class="tab-actions">
            <div class="tab-total" data-tab="cash" style="display: ${currentAssetsTab === 'cash' ? 'block' : 'none'};">
                现金资产总额: <span class="amount positive">¥${formatNumber(stats.cashTotal)}</span>
            </div>
            <div class="tab-total" data-tab="stable" style="display: ${currentAssetsTab === 'stable' ? 'block' : 'none'};">
                稳健资产总额: <span class="amount positive">¥${formatNumber(stats.stableTotal)}</span>
            </div>
            <div class="tab-total" data-tab="physical" style="display: ${currentAssetsTab === 'physical' ? 'block' : 'none'};">
                实物资产总额: <span class="amount positive">¥${formatNumber(stats.physicalTotal)}</span>
            </div>
            <button class="btn-primary" onclick="openModal()">+ 新增记录</button>
        </div>
        
        <!-- 现金资产 -->
        <div id="tab-cash" class="tab-content ${currentAssetsTab === 'cash' ? 'active' : ''}">
            ${renderCashAssets(data[STORE_KEYS.CASH], stats.cashTotal)}
        </div>
        
        <!-- 稳健资产 -->
        <div id="tab-stable" class="tab-content ${currentAssetsTab === 'stable' ? 'active' : ''}">
            ${renderStableAssets(sortedDeposits, data[STORE_KEYS.PROVIDENT], stats.stableTotal)}
        </div>
        
        <!-- 实物资产 -->
        <div id="tab-physical" class="tab-content ${currentAssetsTab === 'physical' ? 'active' : ''}">
            ${renderPhysicalAssets(data[STORE_KEYS.PHYSICAL], stats.physicalTotal)}
        </div>
    `;
}

function renderCashAssets(cashData, total) {
    if (cashData.length === 0) {
        return renderEmptyState('暂无现金类资产', 'cash');
    }
    
    const items = cashData.map(item => `
        <div class="asset-item">
            <div class="asset-info">
                <div class="asset-name">${item.name}</div>
                <div class="asset-detail">${item.account || '无账户信息'}</div>
            </div>
            <div style="text-align: right;">
                <div class="amount positive">¥${formatNumber(item.amount)}</div>
                <div class="asset-actions" style="margin-top: 8px;">
                    <button class="btn-icon" onclick="editItem('cash', '${item.id}')">编辑</button>
                    <button class="btn-icon" onclick="deleteItem('cash', '${item.id}')">删除</button>
                </div>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="asset-section">
            <div class="asset-section-header">
                <div class="asset-section-title">
                    <svg class="section-icon"><use href="#icon-cash"/></svg>
                    现金类流动资产
                    <span class="tag tag-cash">流动</span>
                </div>
                <div class="asset-section-total">¥${formatNumber(total)}</div>
            </div>
            <div class="asset-list">${items}</div>
        </div>
    `;
}

function renderStableAssets(deposits, provident, total) {
    const depositItems = deposits.map(item => {
        const daysUntilDue = Math.ceil((new Date(item.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
        let dueClass = '';
        let dueBadge = '';
        if (daysUntilDue <= 30) {
            dueClass = 'due-urgent';
            dueBadge = '<span class="due-badge urgent">即将到期</span>';
        } else if (daysUntilDue <= 90) {
            dueClass = 'due-soon';
            dueBadge = '<span class="due-badge soon">${daysUntilDue}天后到期</span>';
        }
        
        return `
            <div class="asset-item ${dueClass}">
                <div class="asset-info">
                    <div class="asset-name">${item.bank} ${dueBadge}</div>
                    <div class="asset-detail">${item.rate}% | 到期: ${item.dueDate}</div>
                </div>
                <div style="text-align: right;">
                    <div class="amount positive">¥${formatNumber(item.amount)}</div>
                    <div class="asset-actions" style="margin-top: 8px;">
                        <button class="btn-icon" onclick="editItem('deposit', '${item.id}')">编辑</button>
                        <button class="btn-icon" onclick="deleteItem('deposit', '${item.id}')">删除</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    const providentItems = provident.map(item => `
        <div class="asset-item">
            <div class="asset-info">
                <div class="asset-name">${item.city}公积金</div>
                <div class="asset-detail">账户: ${item.account || '未填写'}</div>
            </div>
            <div style="text-align: right;">
                <div class="amount positive">¥${formatNumber(item.amount)}</div>
                <div class="asset-actions" style="margin-top: 8px;">
                    <button class="btn-icon" onclick="editItem('provident', '${item.id}')">编辑</button>
                    <button class="btn-icon" onclick="deleteItem('provident', '${item.id}')">删除</button>
                </div>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="asset-section">
            <div class="asset-section-header">
                <div class="asset-section-title">
                    <svg class="section-icon"><use href="#icon-bank"/></svg>
                    定期存单
                    <span class="tag tag-stable">稳健</span>
                </div>
                <div class="asset-section-total">¥${formatNumber(deposits.reduce((s, i) => s + parseFloat(i.amount), 0))}</div>
            </div>
            <div class="asset-list">${depositItems || '<div class="empty-state"><div class="empty-state-title">暂无定期存单</div></div>'}</div>
        </div>
        
        <div class="asset-section">
            <div class="asset-section-header">
                <div class="asset-section-title">
                    <svg class="section-icon"><use href="#icon-protect"/></svg>
                    公积金
                    <span class="tag tag-stable">稳健</span>
                </div>
                <div class="asset-section-total">¥${formatNumber(provident.reduce((s, i) => s + parseFloat(i.amount), 0))}</div>
            </div>
            <div class="asset-list">${providentItems || '<div class="empty-state"><div class="empty-state-title">暂无公积金记录</div></div>'}</div>
        </div>
    `;
}

function renderPhysicalAssets(physicalData, total) {
    if (physicalData.length === 0) {
        return renderEmptyState('暂无实物资产', 'physical');
    }
    
    const items = physicalData.map(item => `
        <div class="asset-item">
            <div class="asset-info">
                <div class="asset-name">${item.name}</div>
                <div class="asset-detail">
                    ${item.type === 'house' ? '<svg class="detail-icon"><use href="#icon-house"/></svg> 房产' : '<svg class="detail-icon"><use href="#icon-credit-card"/></svg> 车辆'} | ${item.description || '无描述'}
                </div>
            </div>
            <div style="text-align: right;">
                <div class="amount positive">¥${formatNumber(item.value)}</div>
                <div class="asset-actions" style="margin-top: 8px;">
                    <button class="btn-icon" onclick="editItem('physical', '${item.id}')">编辑</button>
                    <button class="btn-icon" onclick="deleteItem('physical', '${item.id}')">删除</button>
                </div>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="asset-section">
            <div class="asset-section-header">
                <div class="asset-section-title">
                    <svg class="section-icon"><use href="#icon-house"/></svg>
                    实物资产
                    <span class="tag tag-physical">实物</span>
                </div>
                <div class="asset-section-total">¥${formatNumber(total)}</div>
            </div>
            <div class="asset-list">${items}</div>
        </div>
    `;
}

// 投资理财页面
async function renderInvestmentPage() {
    const data = await getAllData();
    const stats = await calculateStats();
    
    // 计算各投资类型总额
    const stocksTotal = stats.stocksATotal + stats.stocksBTotal;
    const fundsTotal = data[STORE_KEYS.FUNDS].reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const wealthTotal = data[STORE_KEYS.WEALTH].reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    // 计算股票总收益
    const stocksAProfit = data[STORE_KEYS.STOCKS_A].reduce((sum, item) => {
        return sum + (parseFloat(item.marketValue || 0) - parseFloat(item.cost || 0));
    }, 0);
    const stocksBProfit = data[STORE_KEYS.STOCKS_B].reduce((sum, item) => {
        return sum + (parseFloat(item.marketValue || 0) - parseFloat(item.cost || 0));
    }, 0);
    const stocksTotalProfit = stocksAProfit + stocksBProfit;

    // 计算基金总收益
    const fundsTotalProfit = data[STORE_KEYS.FUNDS].reduce((sum, item) => {
        return sum + (parseFloat(item.amount || 0) - parseFloat(item.principal || 0));
    }, 0);
    
    // 确定哪个页签是活跃的
    const tabs = [
        { id: 'stocks', label: '股票' },
        { id: 'currency', label: '货币理财' },
        { id: 'funds', label: '基金' },
        { id: 'wealth', label: '理财产品' },
        { id: 'gold', label: '贵金属' }
    ];
    
    const tabHtml = tabs.map(tab => 
        `<div class="tab ${currentInvestTab === tab.id ? 'active' : ''}" onclick="switchInvestTab('${tab.id}')">${tab.label}</div>`
    ).join('');
    
    const contentHtml = tabs.map(tab => {
        let content = '';
        switch(tab.id) {
            case 'stocks': content = renderStocks(data[STORE_KEYS.STOCKS_A], data[STORE_KEYS.STOCKS_B], stats); break;
            case 'currency': content = renderCurrencyInvest(data[STORE_KEYS.CURRENCY], stats.currencyTotal); break;
            case 'funds': content = renderFunds(data[STORE_KEYS.FUNDS], stats); break;
            case 'wealth': content = renderWealthProducts(data[STORE_KEYS.WEALTH], stats); break;
            case 'gold': content = renderGoldAssets(data[STORE_KEYS.GOLD], stats.goldTotal); break;
        }
        return `<div id="tab-${tab.id}" class="tab-content ${currentInvestTab === tab.id ? 'active' : ''}">${content}</div>`;
    }).join('');
    
    return `
        <div class="tabs">${tabHtml}</div>
        
        <div class="tab-actions">
            <div class="tab-total" data-tab="stocks" style="display: ${currentInvestTab === 'stocks' ? 'block' : 'none'};">
                股票总额: <span class="amount positive">¥${formatNumber(stocksTotal)}</span>
                <div class="tab-profit ${stocksTotalProfit >= 0 ? 'positive' : 'negative'}">
                    ${stocksTotalProfit >= 0 ? '+' : ''}¥${formatNumber(stocksTotalProfit)}
                </div>
            </div>
            <div class="tab-total" data-tab="currency" style="display: ${currentInvestTab === 'currency' ? 'block' : 'none'};">
                货币理财总额: <span class="amount positive">¥${formatNumber(stats.currencyTotal)}</span>
            </div>
            <div class="tab-total" data-tab="funds" style="display: ${currentInvestTab === 'funds' ? 'block' : 'none'};">
                基金总额: <span class="amount positive">¥${formatNumber(fundsTotal)}</span>
                <div class="tab-profit ${fundsTotalProfit >= 0 ? 'positive' : 'negative'}">
                    ${fundsTotalProfit >= 0 ? '+' : ''}¥${formatNumber(fundsTotalProfit)}
                </div>
            </div>
            <div class="tab-total" data-tab="wealth" style="display: ${currentInvestTab === 'wealth' ? 'block' : 'none'};">
                理财总额: <span class="amount positive">¥${formatNumber(wealthTotal)}</span>
            </div>
            <div class="tab-total" data-tab="gold" style="display: ${currentInvestTab === 'gold' ? 'block' : 'none'};">
                贵金属总额: <span class="amount positive">¥${formatNumber(stats.goldTotal)}</span>
            </div>
            <button class="btn-primary" onclick="openModal()">+ 新增记录</button>
        </div>
        
        ${contentHtml}
    `;
}

function renderStocks(stocksA, stocksB, stats) {
    const renderStockList = (stocks, type) => {
        if (stocks.length === 0) return '<div class="empty-state"><div class="empty-state-title">暂无持仓</div></div>';
        
        return stocks.map(item => {
            const profit = parseFloat(item.marketValue) - parseFloat(item.cost);
            const profitRate = parseFloat(item.cost) > 0 ? (profit / parseFloat(item.cost) * 100) : 0;
            const typeLabel = type === 'stocks_a' ? 'A股' : 'B股';
            const costPerShare = item.costPerShare || (item.cost / (item.shares || 1)).toFixed(2);
            const pricePerShare = item.pricePerShare || (item.marketValue / (item.shares || 1)).toFixed(2);
            
            return `
                <div class="asset-item">
                    <div class="asset-info">
                        <div class="asset-name">${item.name} (${item.code}) <span class="tag tag-invest">${typeLabel}</span></div>
                        <div class="asset-detail">持仓: ${item.shares || 0}股 | 成本: ¥${formatNumber(costPerShare)}/股 | 现价: ¥${formatNumber(pricePerShare)}/股</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="amount positive">¥${formatNumber(item.marketValue)}</div>
                        <div class="asset-detail ${profit >= 0 ? 'positive' : 'negative'}">
                            ${profit >= 0 ? '+' : ''}¥${formatNumber(profit)} (${profitRate.toFixed(2)}%)
                        </div>
                        <div class="asset-actions" style="margin-top: 4px;">
                            <button class="btn-icon" onclick="editItem('${type}', '${item.id}')">编辑</button>
                            <button class="btn-icon" onclick="deleteItem('${type}', '${item.id}')">删除</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };
    
    return `
        <div class="asset-section">
            <div class="asset-section-header">
                <div class="asset-section-title">
                    <svg class="section-icon"><use href="#icon-stock"/></svg>
                    A股
                    <span class="tag tag-invest">投资</span>
                </div>
                <div class="asset-section-total">¥${formatNumber(stats.stocksATotal)}</div>
            </div>
            <div class="asset-list">${renderStockList(stocksA, 'stocks_a')}</div>
        </div>
        
        <div class="asset-section">
            <div class="asset-section-header">
                <div class="asset-section-title">
                    <svg class="section-icon"><use href="#icon-currency"/></svg>
                    B股
                    <span class="tag tag-invest">投资</span>
                </div>
                <div class="asset-section-total">¥${formatNumber(stats.stocksBTotal)}</div>
            </div>
            <div class="asset-list">${renderStockList(stocksB, 'stocks_b')}</div>
        </div>
    `;
}

function renderCurrencyInvest(currencyData, total) {
    if (currencyData.length === 0) {
        return renderEmptyState('暂无货币理财', 'currency');
    }
    
    const items = currencyData.map(item => `
        <div class="asset-item">
            <div class="asset-info">
                <div class="asset-name">${item.currency} ${item.amount}</div>
                <div class="asset-detail">汇率: ${item.rate} | ${item.platform || '未知平台'}</div>
            </div>
            <div style="text-align: right;">
                <div class="amount positive">≈ ¥${formatNumber(item.cnyValue)}</div>
                <div class="asset-actions" style="margin-top: 8px;">
                    <button class="btn-icon" onclick="editItem('currency', '${item.id}')">编辑</button>
                    <button class="btn-icon" onclick="deleteItem('currency', '${item.id}')">删除</button>
                </div>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="asset-section">
            <div class="asset-section-header">
                <div class="asset-section-title">
                    <svg class="section-icon"><use href="#icon-currency"/></svg>
                    货币理财
                    <span class="tag tag-invest">投资</span>
                </div>
                <div class="asset-section-total">≈ ¥${formatNumber(total)}</div>
            </div>
            <div class="asset-list">${items}</div>
        </div>
    `;
}

function renderFunds(funds, stats) {
    const fundsBank = funds.filter(i => i.platform === 'bank');
    const fundsAlipay = funds.filter(i => i.platform === 'alipay');
    
    const total = funds.reduce((s, i) => s + parseFloat(i.amount), 0);
    
    if (funds.length === 0) {
        return renderEmptyState('暂无基金', 'funds');
    }
    
    const renderFundList = (fundList) => {
        return fundList.map(item => {
            const profit = parseFloat(item.amount) - parseFloat(item.principal || 0);
            return `
                <div class="asset-item">
                    <div class="asset-info">
                        <div class="asset-name">${item.name}</div>
                        <div class="asset-detail">本金: ¥${formatNumber(item.principal || item.amount)} | ${item.risk || '未知风险'}</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="amount positive">¥${formatNumber(item.amount)}</div>
                        <div class="asset-detail ${profit >= 0 ? 'positive' : 'negative'}">
                            盈亏: ${profit >= 0 ? '+' : ''}¥${formatNumber(profit)}
                        </div>
                        <div class="asset-actions" style="margin-top: 4px;">
                            <button class="btn-icon" onclick="editItem('funds', '${item.id}')">编辑</button>
                            <button class="btn-icon" onclick="deleteItem('funds', '${item.id}')">删除</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };
    
    const bankTotal = fundsBank.reduce((s, i) => s + parseFloat(i.amount), 0);
    const alipayTotal = fundsAlipay.reduce((s, i) => s + parseFloat(i.amount), 0);
    
    return `
        <div class="asset-section">
            <div class="asset-section-header">
                <div class="asset-section-title">
                    <svg class="section-icon"><use href="#icon-fund"/></svg>
                    基金总览
                    <span class="tag tag-invest">投资</span>
                </div>
                <div class="asset-section-total">¥${formatNumber(total)}</div>
            </div>            
            <div style="padding: 12px 20px; background: #f9fafb; border-bottom: 1px solid var(--border-color); font-size: 13px; color: var(--text-secondary);">
                <svg class="inline-icon"><use href="#icon-bank"/></svg> 银行: ¥${formatNumber(bankTotal)} | <svg class="inline-icon"><use href="#icon-wallet"/></svg> 支付宝: ¥${formatNumber(alipayTotal)}
            </div>
            <div class="asset-list">${renderFundList(funds)}</div>
        </div>
    `;
}

function renderWealthProducts(wealth, stats) {
    const wealthBank = wealth.filter(i => i.platform === 'bank');
    const wealthAlipay = wealth.filter(i => i.platform === 'alipay');
    
    const total = wealth.reduce((s, i) => s + parseFloat(i.amount), 0);
    
    if (wealth.length === 0) {
        return renderEmptyState('暂无理财产品', 'wealth');
    }
    
    const renderList = (items) => {
        return items.map(item => `
            <div class="asset-item">
                <div class="asset-info">
                    <div class="asset-name">${item.name}</div>
                    <div class="asset-detail">${item.rate}% | ${item.term || '活期'}</div>
                </div>
                <div style="text-align: right;">
                    <div class="amount positive">¥${formatNumber(item.amount)}</div>
                    <div class="asset-detail" style="color: var(--text-secondary); font-size: 12px;">
                        ${item.platform === 'bank' ? '<svg class="inline-icon"><use href="#icon-bank"/></svg> 银行' : '<svg class="inline-icon"><use href="#icon-wallet"/></svg> 支付宝'}
                    </div>
                    <div class="asset-actions" style="margin-top: 4px;">
                        <button class="btn-icon" onclick="editItem('wealth', '${item.id}')">编辑</button>
                        <button class="btn-icon" onclick="deleteItem('wealth', '${item.id}')">删除</button>
                    </div>
                </div>
            </div>
        `).join('');
    };
    
    const bankTotal = wealthBank.reduce((s, i) => s + parseFloat(i.amount), 0);
    const alipayTotal = wealthAlipay.reduce((s, i) => s + parseFloat(i.amount), 0);
    
    return `
        <div class="asset-section">
            <div class="asset-section-header">
                <div class="asset-section-title">
                    <svg class="section-icon"><use href="#icon-wallet"/></svg>
                    理财产品总览
                    <span class="tag tag-invest">投资</span>
                </div>
                <div class="asset-section-total">¥${formatNumber(total)}</div>
            </div>
            <div style="padding: 12px 20px; background: #f9fafb; border-bottom: 1px solid var(--border-color); font-size: 13px; color: var(--text-secondary);">
                <svg class="inline-icon"><use href="#icon-bank"/></svg> 银行: ¥${formatNumber(bankTotal)} | <svg class="inline-icon"><use href="#icon-wallet"/></svg> 支付宝: ¥${formatNumber(alipayTotal)}
            </div>
            <div class="asset-list">${renderList(wealth)}</div>
        </div>
    `;
}

function renderGoldAssets(goldData, total) {
    if (goldData.length === 0) {
        return renderEmptyState('暂无贵金属资产', 'gold');
    }
    
    const items = goldData.map(item => `
        <div class="asset-item">
            <div class="asset-info">
                <div class="asset-name">${item.name}</div>
                <div class="asset-detail">
                    ${item.type === 'accumulate' ? '<svg class="detail-icon"><use href="#icon-gold"/></svg> 积存金' : '<svg class="detail-icon"><use href="#icon-diamond"/></svg> 实物黄金'} | 
                    ${item.weight}克 @ ¥${item.price}/克
                </div>
            </div>
            <div style="text-align: right;">
                <div class="amount positive">¥${formatNumber(item.cnyValue)}</div>
                <div class="asset-actions" style="margin-top: 8px;">
                    <button class="btn-icon" onclick="editItem('gold', '${item.id}')">编辑</button>
                    <button class="btn-icon" onclick="deleteItem('gold', '${item.id}')">删除</button>
                </div>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="asset-section">
            <div class="asset-section-header">
                <div class="asset-section-title">
                    <svg class="section-icon"><use href="#icon-gold"/></svg>
                    贵金属
                    <span class="tag tag-invest">投资</span>
                </div>
                <div class="asset-section-total">¥${formatNumber(total)}</div>
            </div>
            <div class="asset-list">${items}</div>
        </div>
    `;
}

// 负债管理页面
async function renderLiabilitiesPage() {
    const debts = await getData(STORE_KEYS.DEBT);
    const stats = await calculateStats();
    
    if (debts.length === 0) {
        return renderEmptyState('暂无负债记录', 'debt');
    }
    
    const items = debts.map(item => `
        <div class="asset-item">
            <div class="asset-info">
                <div class="asset-name">${item.name}</div>
                <div class="asset-detail">
                    ${item.type === 'credit_card' ? '<svg class="detail-icon"><use href="#icon-credit-card"/></svg> 信用卡' : '<svg class="detail-icon"><use href="#icon-wallet"/></svg> 花呗'} | 
                    账单日: ${item.statementDate || '未设置'} | 
                    还款日: ${item.dueDate || '未设置'}
                </div>
            </div>
            <div style="text-align: right;">
                <div class="amount negative">-¥${formatNumber(item.amount)}</div>
                <div class="asset-detail" style="color: var(--text-secondary);">
                    额度: ¥${formatNumber(item.limit || 0)}
                </div>
                <div class="asset-actions" style="margin-top: 4px;">
                    <button class="btn-icon" onclick="editItem('debt', '${item.id}')">编辑</button>
                    <button class="btn-icon" onclick="deleteItem('debt', '${item.id}')">删除</button>
                </div>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="asset-section">
            <div class="asset-section-header">
                <div class="asset-section-title">
                    <svg class="section-icon"><use href="#icon-credit-card"/></svg>
                    负债
                    <span class="tag tag-debt">负债</span>
                </div>
                <div class="asset-section-total" style="color: var(--danger-color);">¥${formatNumber(stats.debtTotal)}</div>
            </div>
            <div class="asset-list">${items}</div>
        </div>
    `;
}

// 保险管理页面
async function renderInsurancePage() {
    const insurance = await getData(STORE_KEYS.INSURANCE);
    
    if (insurance.length === 0) {
        return renderEmptyState('暂无保险记录', 'insurance');
    }
    
    const items = insurance.map(item => `
        <div class="asset-item">
            <div class="asset-info">
                <div class="asset-name">${item.name}</div>
                <div class="asset-detail">
                    ${item.type === 'medical' ? '<svg class="detail-icon"><use href="#icon-protect"/></svg> 医疗保险' : '<svg class="detail-icon"><use href="#icon-analysis"/></svg> 养老保险'} | 
                    保额: ¥${formatNumber(item.coverage || 0)} | 
                    年缴: ¥${formatNumber(item.premium || 0)}
                </div>
            </div>
            <div style="text-align: right;">
                <div class="asset-detail" style="color: var(--text-secondary);">
                    ${item.company || '未知公司'}
                </div>
                <div class="asset-actions" style="margin-top: 8px;">
                    <button class="btn-icon" onclick="editItem('insurance', '${item.id}')">编辑</button>
                    <button class="btn-icon" onclick="deleteItem('insurance', '${item.id}')">删除</button>
                </div>
            </div>
        </div>
    `).join('');
    
    return `
        <div class="asset-section">
            <div class="asset-section-header">
                <div class="asset-section-title">
                    <svg class="section-icon"><use href="#icon-protect"/></svg>
                    保险
                    <span class="tag tag-insurance">保险</span>
                </div>
                <div class="asset-section-total">${insurance.length} 份保单</div>
            </div>
            <div class="asset-list">${items}</div>
        </div>
    `;
}

// 消费记录页面
async function renderExpensePage() {
    const expenses = await getData(STORE_KEYS.EXPENSE);
    const stats = await calculateStats();
    
    // 按日期倒序
    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    setTimeout(() => {
        renderExpenseChart(expenses);
    }, 100);
    
    if (sorted.length === 0) {
        return renderEmptyState('暂无消费记录', 'expense');
    }
    
    const rows = sorted.slice(0, 50).map(item => `
        <tr>
            <td>${item.date}</td>
            <td>${item.category || '未分类'}</td>
            <td>${item.description || '-'}</td>
            <td class="amount negative">-¥${formatNumber(item.amount)}</td>
            <td>
                <button class="btn-icon" onclick="editItem('expense', '${item.id}')">编辑</button>
                <button class="btn-icon" onclick="deleteItem('expense', '${item.id}')">删除</button>
            </td>
        </tr>
    `).join('');
    
    return `
        <div class="chart-container">
            <div class="chart-title">消费趋势</div>
            <canvas id="expense-chart"></canvas>
        </div>
        
        <div class="table-container">
            <div class="table-header">
                <div class="table-title">消费明细 (最近50条)</div>
                <div style="color: var(--text-secondary);">
                    总计支出: ¥${formatNumber(stats.expenseTotal)}
                </div>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>日期</th>
                        <th>分类</th>
                        <th>描述</th>
                        <th>金额</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

// 财务分析页面
async function renderAnalysisPage() {
    const stats = await calculateStats();
    const history = await getData(STORE_KEYS.HISTORY);
    const monthlyExpense = await getData(STORE_KEYS.MONTHLY_EXPENSE) || 5000;
    
    // 计算应急储备月数（现金资产 / 每月刚性支出）
    const emergencyMonths = monthlyExpense > 0 ? (stats.cashTotal / monthlyExpense) : 0;
    
    return `
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-label">资产负债率</div>
                <div class="metric-value ${getDebtRatioClass(stats.debtTotal, stats.totalAssets)}">
                    ${stats.totalAssets > 0 ? (stats.debtTotal / stats.totalAssets * 100).toFixed(1) : 0}%
                </div>
                <div style="font-size: 13px; color: var(--text-secondary);">
                    ${getDebtRatioAdvice(stats.debtTotal, stats.totalAssets)}
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">流动比率</div>
                <div class="metric-value good">
                    ${stats.debtTotal > 0 ? ((stats.cashTotal + stats.stableTotal) / stats.debtTotal).toFixed(2) : '∞'}
                </div>
                <div style="font-size: 13px; color: var(--text-secondary);">
                    现金+稳健 / 负债
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">投资占比</div>
                <div class="metric-value ${getInvestRatioClass(stats.investTotal, stats.totalAssets)}">
                    ${stats.totalAssets > 0 ? (stats.investTotal / stats.totalAssets * 100).toFixed(1) : 0}%
                </div>
                <div style="font-size: 13px; color: var(--text-secondary);">
                    投资资产 / 总资产
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label" style="display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;">
                    应急储备月数
                    <button class="btn-setting" onclick="openMonthlyExpenseModal()" title="设置每月刚性支出">
                        设置每月刚性支出
                    </button>
                </div>
                <div class="metric-value ${getEmergencyFundClass(emergencyMonths)}">
                    ${monthlyExpense > 0 ? emergencyMonths.toFixed(1) : '∞'}
                </div>
                <div style="font-size: 13px; color: var(--text-secondary);">
                    现金资产 ¥${formatNumber(stats.cashTotal)} / 月支出 ¥${formatNumber(monthlyExpense)}
                </div>
            </div>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">财务健康建议</div>
            <div style="padding: 20px;">
                ${generateFinancialAdvice(stats, emergencyMonths)}
            </div>
        </div>
    `;
}

// ==================== 图表渲染 ====================
function renderPieChart(canvasId, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    // 计算总值和百分比
    const total = data.data.reduce((sum, val) => sum + val, 0);
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.data,
                backgroundColor: data.colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ¥${formatNumber(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'dataLabels',
            afterDraw: function(chart) {
                if (total === 0) return;
                const ctx = chart.ctx;
                ctx.save();
                
                const meta = chart.getDatasetMeta(0);
                meta.data.forEach((element, index) => {
                    const value = data.data[index];
                    if (value === 0) return;
                    
                    const percentage = ((value / total) * 100).toFixed(1);
                    const model = element;
                    const midAngle = model.startAngle + (model.endAngle - model.startAngle) / 2;
                    const radius = model.outerRadius * 0.75;
                    const x = model.x + Math.cos(midAngle) * radius;
                    const y = model.y + Math.sin(midAngle) * radius;
                    
                    ctx.fillStyle = '#000000';
                    ctx.font = '400 11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(percentage + '%', x, y);
                });
                
                ctx.restore();
            }
        }]
    });
}

async function renderNetWorthChart() {
    const ctx = document.getElementById('net-worth-chart');
    if (!ctx) return;
    
    const snapshots = await getData(STORE_KEYS.SNAPSHOTS);
    if (snapshots.length === 0) {
        ctx.parentElement.innerHTML += '<p style="text-align: center; color: var(--text-secondary); margin-top: 40px;">点击右上角"资产快照"按钮记录您的第一笔净资产数据</p>';
        return;
    }
    
    // 按日期排序
    const sortedSnapshots = [...snapshots].sort((a, b) => new Date(a.date) - new Date(b.date));
    const labels = sortedSnapshots.map(h => h.date);
    // 转换为万元
    const data = sortedSnapshots.map(h => (h.netWorth / 10000).toFixed(2));
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '净资产',
                data: data,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: snapshots.length === 1 ? 6 : 4,
                pointHoverRadius: snapshots.length === 1 ? 8 : 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: '万元（人民币）'
                    },
                    ticks: {
                        callback: value => value + '万'
                    }
                }
            }
        }
    });
}

function renderExpenseChart(expenses) {
    const ctx = document.getElementById('expense-chart');
    if (!ctx) return;
    
    // 按月份聚合
    const monthly = {};
    expenses.forEach(e => {
        const month = e.date.substring(0, 7);
        monthly[month] = (monthly[month] || 0) + parseFloat(e.amount);
    });
    
    const sortedMonths = Object.keys(monthly).sort().slice(-6);
    const data = sortedMonths.map(m => monthly[m]);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedMonths,
            datasets: [{
                label: '月消费',
                data: data,
                backgroundColor: '#ef4444',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '¥' + formatNumber(value)
                    }
                }
            }
        }
    });
}

function renderInvestmentAllocationChart(stats) {
    const ctx = document.getElementById('invest-allocation-chart');
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['A股', 'B股', '货币理财', '基金', '银行理财', '黄金'],
            datasets: [{
                label: '金额',
                data: [
                    stats.stocksATotal,
                    stats.stocksBTotal,
                    stats.currencyTotal,
                    stats.fundsTotal,
                    stats.wealthTotal,
                    stats.goldTotal
                ],
                backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#eab308'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '¥' + formatNumber(value)
                    }
                }
            }
        }
    });
}

// ==================== 辅助函数 ====================
function formatNumber(num) {
    if (num === null || num === undefined) return '0.00';
    const n = parseFloat(num);
    if (isNaN(n)) return '0.00';
    return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getRiskLevel(months) {
    if (months >= 6) return 'good';
    if (months >= 3) return 'warning';
    return 'danger';
}

function getRiskLevelText(months) {
    if (months >= 6) return '充足 (6个月以上)';
    if (months >= 3) return '一般 (3-6个月)';
    return '不足 (少于3个月)';
}

function getPercentageClass(value, total) {
    if (total === 0) return '';
    const pct = value / total * 100;
    if (pct >= 30) return 'good';
    if (pct >= 10) return 'warning';
    return '';
}

function getDebtRatioClass(debt, assets) {
    if (assets === 0) return 'good';
    const ratio = debt / assets * 100;
    if (ratio <= 20) return 'good';
    if (ratio <= 40) return 'warning';
    return 'danger';
}

function getDebtRatioAdvice(debt, assets) {
    if (assets === 0) return '请先添加资产';
    const ratio = debt / assets * 100;
    if (ratio <= 20) return '健康 (建议≤40%)';
    if (ratio <= 40) return '合理 (建议≤40%)';
    return '偏高，建议降低负债';
}

function getInvestRatioClass(invest, total) {
    if (total === 0) return '';
    const ratio = invest / total * 100;
    if (ratio <= 30) return 'good';
    if (ratio <= 60) return 'warning';
    return 'danger';
}

function getEmergencyFundClass(months) {
    if (months >= 6) return 'good';
    if (months >= 3) return 'warning';
    return 'danger';
}

function generateFinancialAdvice(stats, emergencyMonths) {
    const advice = [];
    
    // 应急储备
    if (emergencyMonths < 3) {
        advice.push('⚠️ 应急储备不足，建议储备至少3个月的刚性支出');
    } else if (emergencyMonths >= 6) {
        advice.push('✅ 应急储备充足，可覆盖6个月以上支出');
    } else {
        advice.push('💡 应急储备一般，建议逐步增加到6个月');
    }
    
    // 负债
    if (stats.totalAssets > 0 && stats.debtTotal / stats.totalAssets > 0.4) {
        advice.push('负债率偏高，建议优先偿还高息债务');
    }
    
    // 投资占比
    const investRatio = stats.totalAssets > 0 ? stats.investTotal / stats.totalAssets : 0;
    if (investRatio > 0.7) {
        advice.push('投资占比过高，建议增加稳健资产配置');
    } else if (investRatio < 0.2) {
        advice.push('💡 投资占比偏低，可适当增加投资以获取更高收益');
    }
    
    // 资产分散
    if (advice.length === 0) {
        advice.push('✅ 当前资产配置较为合理，继续保持！');
    }
    
    return advice.map(a => `<div style="padding: 12px; background: #f9fafb; border-radius: 8px; margin-bottom: 8px;">${a}</div>
    `).join('');
}

function renderEmptyState(title, type) {
    return `
        <div class="empty-state">
            <svg class="empty-state-icon"><use href="#icon-empty"/></svg>
            <div class="empty-state-title">${title}</div>
            <button class="btn-primary" onclick="openModal('${type}')" style="margin-top: 16px;">
                + 添加第一条记录
            </button>
        </div>
    `;
}

function switchAssetTab(tab, contentId) {
    // 更新全局状态
    currentAssetsTab = contentId;
    
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${contentId}`).classList.add('active');
    
    // 更新统计显示
    document.querySelectorAll('.tab-actions .tab-total').forEach(el => {
        el.style.display = el.dataset.tab === contentId ? 'block' : 'none';
    });
}

// 投资页面子页签切换
function switchInvestTab(tabId) {
    currentInvestTab = tabId;
    
    // 更新页签样式
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    // 更新内容显示
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    // 更新统计显示
    document.querySelectorAll('.tab-actions .tab-total').forEach(el => {
        el.style.display = el.dataset.tab === tabId ? 'block' : 'none';
    });
}

async function recordNetWorthHistory(netWorth) {
    const today = new Date().toISOString().split('T')[0];
    let history = await getData(STORE_KEYS.HISTORY);
    
    // 检查今天是否已记录
    const existingIndex = history.findIndex(h => h.date === today);
    if (existingIndex >= 0) {
        history[existingIndex].netWorth = netWorth;
    } else {
        history.push({ date: today, netWorth });
    }
    
    // 只保留最近12个月的数据
    if (history.length > 365) {
        history = history.slice(-365);
    }
    
    await saveData(STORE_KEYS.HISTORY, history);
}

function updateLastUpdateTime() {
    const el = document.getElementById('last-update-time');
    if (el) {
        el.textContent = new Date().toLocaleString('zh-CN');
    }
}

// ==================== 资产快照功能 ====================
async function takeNetWorthSnapshot() {
    const stats = await calculateStats();
    const snapshots = await getData(STORE_KEYS.SNAPSHOTS);
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // 检查是否已有今天的快照
    const todayIndex = snapshots.findIndex(s => s.date === today);
    if (todayIndex >= 0) {
        if (!confirm('今天已经记录过快照了，要覆盖吗？')) {
            return;
        }
        snapshots[todayIndex].netWorth = stats.netWorth;
        await saveData(STORE_KEYS.SNAPSHOTS, snapshots);
        alert('已更新今天的资产快照！');
        await loadPage('dashboard');
        return;
    }
    
    // 添加新快照
    snapshots.push({
        date: today,
        netWorth: stats.netWorth
    });
    
    // 只保留最近2年的数据
    if (snapshots.length > 104) {
        snapshots.sort((a, b) => new Date(a.date) - new Date(b.date));
        snapshots.splice(0, snapshots.length - 104);
    }
    
    await saveData(STORE_KEYS.SNAPSHOTS, snapshots);
    alert(`资产快照已记录！\n日期: ${today}\n净资产: ¥${formatNumber(stats.netWorth)}`);
    await loadPage('dashboard');
}

// ==================== 每月刚性支出设置 ====================

async function openMonthlyExpenseModal() {
    const currentExpense = await getData(STORE_KEYS.MONTHLY_EXPENSE) || 5000;
    
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('data-form');
    
    editingType = 'monthly_expense';
    editingId = null;
    
    title.textContent = '设置每月刚性支出';
    form.innerHTML = `
        <div class="form-group">
            <label>每月刚性必要支出 *</label>
            <input type="number" name="amount" value="${currentExpense}" step="0.01" required placeholder="如: 5000">
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px;">
                用于计算应急储备月数：现金资产 ÷ 月支出
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

async function saveMonthlyExpense(formData) {
    const amount = parseFloat(formData.get('amount')) || 5000;
    await saveData(STORE_KEYS.MONTHLY_EXPENSE, amount);
    closeModal();
    await loadPage('analysis');
}
