// ==================== 弹窗和表单 ====================

// 处理股票类型切换，显示/隐藏汇率字段
function handleStockTypeChange(select) {
    const exchangeRateField = document.querySelector('[data-show-when-field="stockType"]');
    if (exchangeRateField) {
        exchangeRateField.style.display = select.value === 'b_stock' ? 'block' : 'none';
        const input = exchangeRateField.querySelector('input');
        if (input) {
            input.required = select.value === 'b_stock';
        }
    }
}

// 通用条件字段处理 - 根据选择器类型显示/隐藏相关字段
function handleConditionalFields(select) {
    const fieldName = select.name;
    const selectedValue = select.value;
    
    // 查找所有依赖此字段的条件字段
    document.querySelectorAll(`[data-show-when-field="${fieldName}"]`).forEach(field => {
        const expectedValue = field.dataset.showWhenValue;
        const shouldShow = selectedValue === expectedValue;
        field.style.display = shouldShow ? 'block' : 'none';
        
        // 更新必填状态
        const input = field.querySelector('input, select, textarea');
        if (input) {
            const isRequired = field.querySelector('label')?.textContent?.includes(' *');
            if (isRequired) {
                input.required = shouldShow;
            }
            // 隐藏时清空值
            if (!shouldShow) {
                input.value = '';
            }
        }
    });
}

// 初始化所有条件字段的显示状态
function initConditionalFields() {
    document.querySelectorAll('select[data-conditional]').forEach(select => {
        handleConditionalFields(select);
    });
}

const FORM_CONFIG = {
    cash: {
        title: '现金资产',
        fields: [
            { name: 'name', label: '名称', type: 'text', required: true, placeholder: '如: 支付宝余额' },
            { name: 'account', label: '账户', type: 'text', placeholder: '如: 138****8888' },
            { name: 'amount', label: '金额', type: 'number', required: true, step: '0.01' }
        ],
        storeKey: STORE_KEYS.CASH
    },
    deposit: {
        title: '定期存单',
        fields: [
            { name: 'bank', label: '银行', type: 'text', required: true },
            { name: 'amount', label: '金额', type: 'number', required: true, step: '0.01' },
            { name: 'rate', label: '年利率(%)', type: 'number', step: '0.01' },
            { name: 'dueDate', label: '到期日', type: 'date', required: true }
        ],
        storeKey: STORE_KEYS.DEPOSIT
    },
    provident: {
        title: '公积金',
        fields: [
            { name: 'city', label: '城市', type: 'text', required: true },
            { name: 'account', label: '账号', type: 'text' },
            { name: 'amount', label: '余额', type: 'number', required: true, step: '0.01' }
        ],
        storeKey: STORE_KEYS.PROVIDENT
    },
    // 稳健资产选择器 - 根据类型显示不同字段
    stable_asset: {
        title: '稳健资产',
        fields: [
            { name: 'stableType', label: '资产类型', type: 'select', required: true,
              options: ['deposit', 'provident', 'bond', 'other'],
              optionLabels: { deposit: '定期存单', provident: '公积金', bond: '国债', other: '其他稳健资产' } },
            // 定期存单字段
            { name: 'bank', label: '银行', type: 'text', required: true,
              showWhen: { field: 'stableType', value: 'deposit' } },
            // 公积金字段
            { name: 'city', label: '城市', type: 'text', required: true,
              showWhen: { field: 'stableType', value: 'provident' } },
            { name: 'account', label: '账号', type: 'text',
              showWhen: { field: 'stableType', value: 'provident' } },
            // 国债字段
            { name: 'bondName', label: '国债名称', type: 'text', required: true,
              showWhen: { field: 'stableType', value: 'bond' } },
            { name: 'bondCode', label: '国债代码', type: 'text',
              showWhen: { field: 'stableType', value: 'bond' } },
            // 其他稳健资产字段
            { name: 'assetName', label: '资产名称', type: 'text', required: true,
              showWhen: { field: 'stableType', value: 'other' } },
            // 共同字段
            { name: 'amount', label: '金额', type: 'number', required: true, step: '0.01' },
            { name: 'rate', label: '年利率(%)', type: 'number', step: '0.01' },
            { name: 'dueDate', label: '到期日', type: 'date',
              showWhen: { field: 'stableType', value: 'deposit' } },
            { name: 'remark', label: '备注', type: 'text' }
        ],
        storeKey: STORE_KEYS.DEPOSIT,  // 默认存储到 deposits
        calculate: (data) => {
            // 根据类型设置名称
            if (data.stableType === 'deposit') {
                data.name = data.bank + ' 定期';
            } else if (data.stableType === 'provident') {
                data.name = data.city + '公积金';
            } else if (data.stableType === 'bond') {
                data.name = data.bondName;
            } else {
                data.name = data.assetName;
            }
            // 根据类型存储到不同的 storeKey
            if (data.stableType === 'provident') {
                data._targetStoreKey = STORE_KEYS.PROVIDENT;
            }
            return data;
        }
    },
    // 实物资产选择器
    physical_asset: {
        title: '实物资产',
        fields: [
            { name: 'physicalType', label: '资产类型', type: 'select', required: true,
              options: ['house', 'car', 'other'],
              optionLabels: { house: '房产', car: '车辆', other: '其他' } },
            { name: 'name', label: '资产名称', type: 'text', required: true, placeholder: '如: 自住房/代步车' },
            // 房产特有字段
            { name: 'address', label: '地址', type: 'text',
              showWhen: { field: 'physicalType', value: 'house' } },
            { name: 'area', label: '面积(m²)', type: 'number', step: '0.01',
              showWhen: { field: 'physicalType', value: 'house' } },
            // 车辆特有字段
            { name: 'plate', label: '车牌号', type: 'text',
              showWhen: { field: 'physicalType', value: 'car' } },
            { name: 'brand', label: '品牌型号', type: 'text',
              showWhen: { field: 'physicalType', value: 'car' } },
            // 其他描述
            { name: 'description', label: '描述', type: 'text', placeholder: '如: 收藏品、珠宝等' },
            { name: 'value', label: '当前估值', type: 'number', required: true, step: '0.01' },
            { name: 'purchaseDate', label: '购买日期', type: 'date' },
            { name: 'remark', label: '备注', type: 'text' }
        ],
        storeKey: STORE_KEYS.PHYSICAL,
        calculate: (data) => {
            data.type = data.physicalType;
            return data;
        }
    },
    stocks_a: {
        title: '股票持仓',
        fields: [
            { name: 'stockType', label: '股票类型', type: 'select', required: true, 
              options: ['a_stock', 'b_stock'], optionLabels: { a_stock: 'A股', b_stock: 'B股' } },
            { name: 'name', label: '股票名称', type: 'text', required: true },
            { name: 'code', label: '股票代码', type: 'text', required: true },
            { name: 'shares', label: '持仓股数', type: 'number', required: true },
            { name: 'costPerShare', label: '单股成本金额', type: 'number', required: true, step: '0.01' },
            { name: 'pricePerShare', label: '当前现价', type: 'number', required: true, step: '0.01' },
            { name: 'exchangeRate', label: '当前美元汇率', type: 'number', step: '0.0001', 
              showWhen: { field: 'stockType', value: 'b_stock' }, placeholder: '仅B股需要填写' }
        ],
        storeKey: STORE_KEYS.STOCKS_A,
        calculate: (data) => {
            // 计算总成本和市值
            const shares = parseFloat(data.shares) || 0;
            const costPerShare = parseFloat(data.costPerShare) || 0;
            const pricePerShare = parseFloat(data.pricePerShare) || 0;

            data.cost = shares * costPerShare;
            data.marketValue = shares * pricePerShare;

            // B股需要转换汇率
            if (data.stockType === 'b_stock' && data.exchangeRate) {
                const rate = parseFloat(data.exchangeRate) || 1;
                data.cost = data.cost * rate;
                data.marketValue = data.marketValue * rate;
            }

            // 根据选择的股票类型动态设置目标存储位置
            if (data.stockType === 'b_stock') {
                data._targetStoreKey = STORE_KEYS.STOCKS_B;
            }

            return data;
        }
    },
    stocks_b: {
        title: 'B股持仓',
        fields: [
            { name: 'stockType', label: '股票类型', type: 'select', required: true, 
              options: ['a_stock', 'b_stock'], optionLabels: { a_stock: 'A股', b_stock: 'B股' } },
            { name: 'name', label: '股票名称', type: 'text', required: true },
            { name: 'code', label: '股票代码', type: 'text', required: true },
            { name: 'shares', label: '持仓股数', type: 'number', required: true },
            { name: 'costPerShare', label: '单股成本金额', type: 'number', required: true, step: '0.01' },
            { name: 'pricePerShare', label: '当前现价', type: 'number', required: true, step: '0.01' },
            { name: 'exchangeRate', label: '当前美元汇率', type: 'number', step: '0.0001', required: true }
        ],
        storeKey: STORE_KEYS.STOCKS_B,
        calculate: (data) => {
            const shares = parseFloat(data.shares) || 0;
            const costPerShare = parseFloat(data.costPerShare) || 0;
            const pricePerShare = parseFloat(data.pricePerShare) || 0;
            const rate = parseFloat(data.exchangeRate) || 1;
            
            data.cost = shares * costPerShare * rate;
            data.marketValue = shares * pricePerShare * rate;
            
            // 根据选择的股票类型动态设置目标存储位置
            if (data.stockType === 'a_stock') {
                data._targetStoreKey = STORE_KEYS.STOCKS_A;
            }
            
            return data;
        }
    },
    currency: {
        title: '货币理财',
        fields: [
            { name: 'currency', label: '币种', type: 'select', required: true, 
              options: ['USD', 'EUR', 'GBP', 'JPY', 'HKD', 'AUD', 'CHF', '其他'] },
            { name: 'amount', label: '持有金额', type: 'number', required: true, step: '0.01' },
            { name: 'rate', label: '当前汇率', type: 'number', required: true, step: '0.0001' },
            { name: 'platform', label: '平台', type: 'text', placeholder: '如: 中国银行' }
        ],
        storeKey: STORE_KEYS.CURRENCY,
        calculate: (data) => {
            data.cnyValue = parseFloat(data.amount) * parseFloat(data.rate);
            return data;
        }
    },
    funds: {
        title: '基金',
        fields: [
            { name: 'name', label: '基金名称', type: 'text', required: true },
            { name: 'code', label: '基金代码', type: 'text' },
            { name: 'platform', label: '购买平台', type: 'select', required: true, 
              options: ['bank', 'alipay'], optionLabels: { bank: '银行', alipay: '支付宝' } },
            { name: 'principal', label: '投入本金', type: 'number', required: true, step: '0.01' },
            { name: 'amount', label: '当前市值', type: 'number', required: true, step: '0.01' },
            { name: 'risk', label: '风险等级', type: 'select', options: ['低风险', '中低风险', '中风险', '中高风险', '高风险'] }
        ],
        storeKey: STORE_KEYS.FUNDS
    },
    wealth: {
        title: '理财产品',
        fields: [
            { name: 'name', label: '产品名称', type: 'text', required: true },
            { name: 'platform', label: '购买平台', type: 'select', required: true,
              options: ['bank', 'alipay'], optionLabels: { bank: '银行', alipay: '支付宝' } },
            { name: 'amount', label: '金额', type: 'number', required: true, step: '0.01' },
            { name: 'rate', label: '预期年化(%)', type: 'number', step: '0.01' },
            { name: 'term', label: '期限', type: 'text', placeholder: '如: 365天' }
        ],
        storeKey: STORE_KEYS.WEALTH
    },
    gold: {
        title: '贵金属',
        fields: [
            { name: 'name', label: '名称', type: 'text', required: true, placeholder: '如: 工行积存金' },
            { name: 'type', label: '类型', type: 'select', required: true, options: ['accumulate', 'physical'], 
              optionLabels: { accumulate: '积存金', physical: '实物黄金' } },
            { name: 'weight', label: '重量(克)', type: 'number', required: true, step: '0.01' },
            { name: 'price', label: '当前金价(元/克)', type: 'number', required: true, step: '0.01' }
        ],
        storeKey: STORE_KEYS.GOLD,
        calculate: (data) => {
            data.cnyValue = parseFloat(data.weight) * parseFloat(data.price);
            return data;
        }
    },
    physical: {
        title: '实物资产',
        fields: [
            { name: 'name', label: '名称', type: 'text', required: true, placeholder: '如: 北京市朝阳区房产' },
            { name: 'type', label: '类型', type: 'select', required: true, options: ['house', 'car'],
              optionLabels: { house: '房产', car: '车辆' } },
            { name: 'value', label: '估值', type: 'number', required: true, step: '0.01' },
            { name: 'description', label: '描述', type: 'text', placeholder: '如: 90平米,2018年购入' }
        ],
        storeKey: STORE_KEYS.PHYSICAL
    },
    debt: {
        title: '负债',
        fields: [
            { name: 'name', label: '名称', type: 'text', required: true, placeholder: '如: 招商银行信用卡' },
            { name: 'type', label: '类型', type: 'select', required: true, options: ['credit_card', 'huabei'],
              optionLabels: { credit_card: '信用卡', huabei: '花呗' } },
            { name: 'amount', label: '当前欠款', type: 'number', required: true, step: '0.01' },
            { name: 'limit', label: '额度', type: 'number', step: '0.01' },
            { name: 'statementDate', label: '账单日', type: 'text', placeholder: '如: 每月5日' },
            { name: 'dueDate', label: '还款日', type: 'text', placeholder: '如: 每月25日' }
        ],
        storeKey: STORE_KEYS.DEBT
    },
    insurance: {
        title: '保险',
        fields: [
            { name: 'name', label: '保险产品名称', type: 'text', required: true },
            { name: 'type', label: '类型', type: 'select', required: true, options: ['medical', 'pension'],
              optionLabels: { medical: '医疗保险', pension: '养老保险' } },
            { name: 'company', label: '保险公司', type: 'text' },
            { name: 'coverage', label: '保额', type: 'number', step: '0.01' },
            { name: 'premium', label: '年缴保费', type: 'number', step: '0.01' },
            { name: 'startDate', label: '生效日期', type: 'date' },
            { name: 'endDate', label: '到期日期', type: 'date' }
        ],
        storeKey: STORE_KEYS.INSURANCE
    },
    expense: {
        title: '消费记录',
        fields: [
            { name: 'date', label: '日期', type: 'date', required: true },
            { name: 'category', label: '分类', type: 'select', required: true,
              options: ['餐饮', '交通', '购物', '娱乐', '医疗', '教育', '居住', '其他'] },
            { name: 'description', label: '描述', type: 'text', placeholder: '如: 超市购物' },
            { name: 'amount', label: '金额', type: 'number', required: true, step: '0.01' }
        ],
        storeKey: STORE_KEYS.EXPENSE
    }
};

function openModal(type = null) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('data-form');
    
    // 确定要打开的类型
    if (!type) {
        // 如果在投资页面，根据当前子页签决定类型
        if (currentPage === 'investment' && currentInvestTab) {
            const typeMap = {
                'stocks': 'stocks_a',
                'currency': 'currency',
                'funds': 'funds',
                'wealth': 'wealth',
                'gold': 'gold'
            };
            type = typeMap[currentInvestTab] || 'stocks_a';
        } else if (currentPage === 'assets') {
            // 资产管理页面根据当前子页签决定类型
            const typeMap = {
                'cash': 'cash',
                'stable': 'stable_asset',  // 稳健资产选择器
                'physical': 'physical_asset'  // 实物资产选择器
            };
            type = typeMap[currentAssetsTab] || 'cash';
        } else {
            type = currentPage === 'liabilities' ? 'debt' :
                   currentPage === 'insurance' ? 'insurance' :
                   currentPage === 'expense' ? 'expense' : 'cash';
        }
    }
    
    editingType = type;
    editingId = null;
    
    const config = FORM_CONFIG[type];
    if (!config) return;
    
    title.textContent = '新增' + config.title;
    form.innerHTML = generateFormHTML(config.fields);
    
    // 初始化条件字段显示状态（innerHTML 中的脚本不会执行，需手动调用）
    setTimeout(() => {
        initConditionalFields();
    }, 0);
    
    modal.classList.add('active');
}

function editItem(type, id) {
    const config = FORM_CONFIG[type];
    if (!config) return;
    
    editingType = type;
    editingId = id;
    
    // 加载数据
    getData(config.storeKey).then(items => {
        const item = items.find(i => i.id === id);
        if (!item) return;
        
        // 旧数据兼容：如果没有 stockType，根据类型推断
        if (type === 'stocks_a' && !item.stockType) {
            item.stockType = 'a_stock';
        }
        if (type === 'stocks_b' && !item.stockType) {
            item.stockType = 'b_stock';
        }
        
        // 旧数据兼容：如果没有单股数据，计算出来
        if (type === 'stocks_a' || type === 'stocks_b') {
            if (!item.costPerShare && item.cost && item.shares) {
                item.costPerShare = (parseFloat(item.cost) / parseFloat(item.shares)).toFixed(2);
            }
            if (!item.pricePerShare && item.marketValue && item.shares) {
                item.pricePerShare = (parseFloat(item.marketValue) / parseFloat(item.shares)).toFixed(2);
            }
        }
        
        const modal = document.getElementById('modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('data-form');
        
        title.textContent = '编辑' + config.title;
        form.innerHTML = generateFormHTML(config.fields, item);
        
        // 初始化条件字段显示状态（innerHTML 中的脚本不会执行，需手动调用）
        setTimeout(() => {
            initConditionalFields();
        }, 0);
        
        modal.classList.add('active');
    });
}

function generateFormHTML(fields, data = null) {
    // 收集所有有条件显示依赖的字段名
    const conditionalFields = new Set();
    fields.forEach(f => {
        if (f.showWhen) {
            conditionalFields.add(f.showWhen.field);
        }
    });

    const html = fields.map(field => {
        const value = data ? (data[field.name] || '') : '';
        
        // 处理条件显示字段
        const showWhen = field.showWhen;
        const conditionalAttr = showWhen ? `data-show-when-field="${showWhen.field}" data-show-when-value="${showWhen.value}" style="display: none;"` : '';
        
        if (field.type === 'select') {
            const options = field.options.map(opt => {
                const label = field.optionLabels ? field.optionLabels[opt] : opt;
                return `<option value="${opt}" ${value === opt ? 'selected' : ''}>${label}</option>`;
            }).join('');
            
            // 如果是条件控制字段，添加 data-conditional 属性
            const isConditional = conditionalFields.has(field.name);
            const onchangeHandler = isConditional ? `onchange="handleConditionalFields(this)"` : 
                                   (field.name === 'stockType' ? `onchange="handleStockTypeChange(this)"` : '');
            
            return `
                <div class="form-group" ${conditionalAttr}>
                    <label>${field.label}${field.required ? ' *' : ''}</label>
                    <select name="${field.name}" ${field.required ? 'required' : ''} ${isConditional ? 'data-conditional' : ''} ${onchangeHandler}>
                        ${options}
                    </select>
                </div>
            `;
        }
        
        return `
            <div class="form-group" ${conditionalAttr}>
                <label>${field.label}${field.required ? ' *' : ''}</label>
                <input type="${field.type}" name="${field.name}" 
                       value="${value}" 
                       ${field.required ? 'required' : ''}
                       ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}
                       ${field.step ? `step="${field.step}"` : ''}>
            </div>
        `;
    }).join('');
    
    // 返回HTML并添加初始化脚本
    return html + `
        <script>
            (function() {
                // 初始化所有条件字段
                setTimeout(function() {
                    document.querySelectorAll('select[data-conditional]').forEach(function(select) {
                        handleConditionalFields(select);
                    });
                    // 兼容旧的股票类型处理
                    const stockTypeSelect = document.querySelector('select[name="stockType"]');
                    if (stockTypeSelect && !stockTypeSelect.dataset.conditional) {
                        handleStockTypeChange(stockTypeSelect);
                    }
                }, 0);
            })();
        </script>
    `;
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
    editingId = null;
    editingType = null;
}

async function saveFormData() {
    const form = document.getElementById('data-form');
    const formData = new FormData(form);
    
    // 处理每月刚性支出设置
    if (editingType === 'monthly_expense') {
        await saveMonthlyExpense(formData);
        return;
    }
    
    const config = FORM_CONFIG[editingType];
    if (!config) return;
    
    // 收集数据
    let data = {};
    config.fields.forEach(field => {
        data[field.name] = formData.get(field.name);
        if (field.type === 'number' && data[field.name]) {
            data[field.name] = parseFloat(data[field.name]);
        }
    });
    
    // 执行计算
    if (config.calculate) {
        data = config.calculate(data);
    }
    
    // 确定存储的 storeKey（支持动态目标存储）
    let storeKey = config.storeKey;
    if (data._targetStoreKey) {
        storeKey = data._targetStoreKey;
        delete data._targetStoreKey;  // 清理临时字段
    }
    
    // 获取现有数据
    let items = await getData(storeKey);
    
    if (editingId) {
        // 更新
        const index = items.findIndex(i => i.id === editingId);
        if (index >= 0) {
            items[index] = { ...items[index], ...data };
        }
    } else {
        // 新增
        data.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        data.createdAt = new Date().toISOString();
        items.push(data);
    }
    
    // 保存
    await saveDataToStore(storeKey, items);
    
    closeModal();
    await loadPage(currentPage);
}

async function deleteItem(type, id) {
    if (!confirm('确定要删除这条记录吗？')) return;
    
    const config = FORM_CONFIG[type];
    if (!config) return;
    
    let items = await getData(config.storeKey);
    items = items.filter(i => i.id !== id);
    
    await saveDataToStore(config.storeKey, items);
    await loadPage(currentPage);
}

async function saveDataToStore(key, data) {
    await localforage.setItem(key, data);
    updateLastUpdateTime();
}

// ==================== 导入导出 & 清空数据 ====================

async function exportData() {
    const data = await getAllData();
    const exportObj = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: data
    };
    
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('数据已导出！');
}

function importData() {
    document.getElementById('import-modal').classList.add('active');
}

function closeImportModal() {
    document.getElementById('import-modal').classList.remove('active');
    document.getElementById('import-data').value = '';
}

async function confirmImport() {
    const textarea = document.getElementById('import-data');
    const jsonStr = textarea.value.trim();
    
    if (!jsonStr) {
        alert('请输入JSON数据');
        return;
    }
    
    try {
        const importObj = JSON.parse(jsonStr);
        
        if (!confirm('导入将覆盖现有数据，确定继续吗？')) return;
        
        // 导入数据
        for (const [key, value] of Object.entries(importObj.data || importObj)) {
            if (Object.values(STORE_KEYS).includes(key)) {
                await localforage.setItem(key, value);
            }
        }
        
        alert('数据导入成功！');
        closeImportModal();
        await loadPage(currentPage);
        
    } catch (e) {
        alert('数据格式错误：' + e.message);
    }
}

// ==================== 清空所有数据 ====================

function clearAllData() {
    document.getElementById('clear-modal').classList.add('active');
}

function closeClearModal() {
    document.getElementById('clear-modal').classList.remove('active');
    document.getElementById('clear-confirm-input').value = '';
}

async function confirmClearAllData() {
    const input = document.getElementById('clear-confirm-input');
    const confirmText = input.value.trim();
    
    if (confirmText !== 'DELETE') {
        alert('请输入 "DELETE" 以确认清空操作');
        return;
    }
    
    try {
        // 清空所有存储的数据
        for (const key of Object.values(STORE_KEYS)) {
            await localforage.setItem(key, []);
        }
        
        alert('所有数据已清空！');
        closeClearModal();
        await loadPage(currentPage);
        updateLastUpdateTime();
    } catch (e) {
        alert('清空数据失败：' + e.message);
    }
}

// ==================== 额外工具函数 ====================

// 计算距离到期的天数
function getDaysUntilDue(dueDate) {
    const due = new Date(dueDate);
    const now = new Date();
    return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

// 格式化日期
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
}

// 计算收益率
function calculateReturn(cost, current) {
    if (!cost || cost === 0) return 0;
    return ((current - cost) / cost * 100).toFixed(2);
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 监听窗口大小变化，重新渲染图表
window.addEventListener('resize', debounce(() => {
    if (currentPage === 'dashboard') {
        loadPage('dashboard');
    } else if (currentPage === 'expense') {
        loadPage('expense');
    } else if (currentPage === 'analysis') {
        loadPage('analysis');
    }
}, 300));

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    // ESC 关闭弹窗
    if (e.key === 'Escape') {
        closeModal();
        closeImportModal();
    }
    
    // Ctrl+N 新增
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        openModal();
    }
});

// 页面可见性变化时刷新数据
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        loadPage(currentPage);
    }
});
