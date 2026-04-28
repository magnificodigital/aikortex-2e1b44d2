export type PaymentStatus = "paid" | "pending" | "overdue" | "cancelled";
export type PaymentFrequency = "monthly" | "quarterly" | "yearly" | "one-time";
export type RevenueSource = "retainer" | "subscription" | "project" | "consulting" | "implementation";
export type TransactionType = "income" | "expense" | "transfer";
export type CostCenterType = "operational" | "marketing" | "technology" | "personnel" | "infrastructure" | "tools" | "taxes" | "other";
export type AccountType = "checking" | "savings" | "credit" | "investment" | "cash";

export interface Invoice {
  id: string;
  client: string;
  clientId: string;
  description: string;
  amount: number;
  dueDate: string;
  issueDate: string;
  status: PaymentStatus;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface RevenueEntry {
  id: string;
  client: string;
  clientId: string;
  amount: number;
  frequency: PaymentFrequency;
  source: RevenueSource;
  status: PaymentStatus;
  date: string;
  description: string;
}

export interface Subscription {
  id: string;
  client: string;
  clientId: string;
  plan: string;
  amount: number;
  frequency: PaymentFrequency;
  startDate: string;
  nextBillingDate: string;
  status: "active" | "paused" | "cancelled";
}

export interface Expense {
  id: string;
  category: string;
  costCenter: CostCenterType;
  description: string;
  amount: number;
  date: string;
  recurring: boolean;
  frequency?: PaymentFrequency;
  vendor?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  date: string;
  accountId: string;
  client?: string;
  invoiceId?: string;
  costCenter?: CostCenterType;
  reconciled: boolean;
}

export interface BankAccount {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  institution: string;
  lastSync: string;
}

export interface CostCenter {
  id: string;
  name: string;
  type: CostCenterType;
  budget: number;
  spent: number;
  color: string;
}

export interface Budget {
  id: string;
  name: string;
  period: string;
  totalBudget: number;
  totalSpent: number;
  categories: BudgetCategory[];
}

export interface BudgetCategory {
  name: string;
  costCenter: CostCenterType;
  budgeted: number;
  actual: number;
}

export interface CashFlowEntry {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface AccountPayable {
  id: string;
  vendor: string;
  description: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  category: CostCenterType;
}

export interface AccountReceivable {
  id: string;
  client: string;
  description: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  invoiceId?: string;
}

export interface ProfitLossEntry {
  category: string;
  subcategories: { name: string; amount: number }[];
  total: number;
}

export const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string }> = {
  paid: { label: "Pago", color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
  pending: { label: "Pendente", color: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
  overdue: { label: "Atrasado", color: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelado", color: "bg-muted text-muted-foreground" },
};

export const frequencyLabels: Record<PaymentFrequency, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
  "one-time": "Único",
};

export const sourceLabels: Record<RevenueSource, string> = {
  retainer: "Retainer",
  subscription: "Assinatura",
  project: "Projeto",
  consulting: "Consultoria",
  implementation: "Implementação",
};

export const costCenterLabels: Record<CostCenterType, string> = {
  operational: "Operacional",
  marketing: "Marketing",
  technology: "Tecnologia",
  personnel: "Pessoal",
  infrastructure: "Infraestrutura",
  tools: "Ferramentas",
  taxes: "Impostos",
  other: "Outros",
};

export const accountTypeLabels: Record<AccountType, string> = {
  checking: "Conta Corrente",
  savings: "Poupança",
  credit: "Cartão de Crédito",
  investment: "Investimento",
  cash: "Caixa",
};

// Mock data
export const mockInvoices: Invoice[] = [
  { id: "INV-001", client: "TechFlow Corp", clientId: "c1", description: "Automação IA - Março 2025", amount: 8500, dueDate: "2025-03-15", issueDate: "2025-03-01", status: "paid", items: [{ description: "Automação IA", quantity: 1, unitPrice: 8500, total: 8500 }] },
  { id: "INV-002", client: "Nova Digital", clientId: "c2", description: "Gestão de Tráfego - Março 2025", amount: 4200, dueDate: "2025-03-10", issueDate: "2025-03-01", status: "paid", items: [{ description: "Gestão de Tráfego", quantity: 1, unitPrice: 4200, total: 4200 }] },
  { id: "INV-003", client: "Startup Hub", clientId: "c3", description: "Desenvolvimento Web + IA", amount: 12000, dueDate: "2025-03-20", issueDate: "2025-03-05", status: "pending", items: [{ description: "Desenvolvimento Web", quantity: 1, unitPrice: 7000, total: 7000 }, { description: "Agente IA", quantity: 1, unitPrice: 5000, total: 5000 }] },
  { id: "INV-004", client: "MegaStore", clientId: "c4", description: "Chatbot + CRM - Fevereiro 2025", amount: 6800, dueDate: "2025-02-28", issueDate: "2025-02-01", status: "overdue", items: [{ description: "Chatbot IA", quantity: 1, unitPrice: 4000, total: 4000 }, { description: "Integração CRM", quantity: 1, unitPrice: 2800, total: 2800 }] },
  { id: "INV-005", client: "Fintech Plus", clientId: "c5", description: "Consultoria IA - Março 2025", amount: 15000, dueDate: "2025-03-25", issueDate: "2025-03-10", status: "pending", items: [{ description: "Consultoria IA", quantity: 1, unitPrice: 15000, total: 15000 }] },
  { id: "INV-006", client: "EduTech", clientId: "c6", description: "Plataforma E-learning", amount: 9500, dueDate: "2025-03-30", issueDate: "2025-03-15", status: "pending", items: [{ description: "Plataforma E-learning", quantity: 1, unitPrice: 9500, total: 9500 }] },
  { id: "INV-007", client: "HealthCare AI", clientId: "c7", description: "Voice Agent - Janeiro 2025", amount: 3200, dueDate: "2025-01-31", issueDate: "2025-01-01", status: "cancelled", items: [{ description: "Voice Agent", quantity: 1, unitPrice: 3200, total: 3200 }] },
];

export const mockRevenue: RevenueEntry[] = [
  { id: "r1", client: "TechFlow Corp", clientId: "c1", amount: 8500, frequency: "monthly", source: "retainer", status: "paid", date: "2025-03-01", description: "Retainer mensal" },
  { id: "r2", client: "Nova Digital", clientId: "c2", amount: 4200, frequency: "monthly", source: "subscription", status: "paid", date: "2025-03-01", description: "Assinatura SaaS" },
  { id: "r3", client: "Startup Hub", clientId: "c3", amount: 12000, frequency: "one-time", source: "project", status: "pending", date: "2025-03-05", description: "Projeto Web + IA" },
  { id: "r4", client: "MegaStore", clientId: "c4", amount: 6800, frequency: "monthly", source: "retainer", status: "overdue", date: "2025-02-01", description: "Chatbot + CRM" },
  { id: "r5", client: "Fintech Plus", clientId: "c5", amount: 15000, frequency: "quarterly", source: "consulting", status: "pending", date: "2025-03-10", description: "Consultoria estratégica" },
  { id: "r6", client: "EduTech", clientId: "c6", amount: 9500, frequency: "one-time", source: "implementation", status: "pending", date: "2025-03-15", description: "Implementação plataforma" },
];

export const mockSubscriptions: Subscription[] = [
  { id: "s1", client: "TechFlow Corp", clientId: "c1", plan: "Enterprise AI", amount: 8500, frequency: "monthly", startDate: "2024-06-01", nextBillingDate: "2025-04-01", status: "active" },
  { id: "s2", client: "Nova Digital", clientId: "c2", plan: "Growth", amount: 4200, frequency: "monthly", startDate: "2024-09-01", nextBillingDate: "2025-04-01", status: "active" },
  { id: "s3", client: "MegaStore", clientId: "c4", plan: "Starter AI", amount: 2500, frequency: "monthly", startDate: "2024-11-01", nextBillingDate: "2025-04-01", status: "active" },
  { id: "s4", client: "Fintech Plus", clientId: "c5", plan: "Premium Consulting", amount: 15000, frequency: "quarterly", startDate: "2025-01-01", nextBillingDate: "2025-04-01", status: "active" },
  { id: "s5", client: "HealthCare AI", clientId: "c7", plan: "Basic", amount: 3200, frequency: "monthly", startDate: "2024-08-01", nextBillingDate: "-", status: "cancelled" },
];

export const mockExpenses: Expense[] = [
  { id: "e1", category: "Software", costCenter: "technology", description: "OpenAI API", amount: 2400, date: "2025-03-01", recurring: true, frequency: "monthly", vendor: "OpenAI", paymentMethod: "Cartão Corporativo" },
  { id: "e2", category: "Software", costCenter: "technology", description: "Servidor Cloud (AWS)", amount: 850, date: "2025-03-01", recurring: true, frequency: "monthly", vendor: "AWS", paymentMethod: "Cartão Corporativo" },
  { id: "e3", category: "Marketing", costCenter: "marketing", description: "Google Ads", amount: 3500, date: "2025-03-01", recurring: true, frequency: "monthly", vendor: "Google", paymentMethod: "Cartão Corporativo" },
  { id: "e4", category: "Operacional", costCenter: "infrastructure", description: "Coworking", amount: 1200, date: "2025-03-01", recurring: true, frequency: "monthly", vendor: "WeWork", paymentMethod: "Boleto" },
  { id: "e5", category: "Software", costCenter: "tools", description: "Ferramentas SaaS (Figma, Notion, Slack)", amount: 680, date: "2025-03-01", recurring: true, frequency: "monthly", vendor: "Diversos", paymentMethod: "Cartão Corporativo" },
  { id: "e6", category: "Pessoal", costCenter: "personnel", description: "Freelancer - Design", amount: 4500, date: "2025-03-05", recurring: false, vendor: "João Designer", paymentMethod: "PIX" },
  { id: "e7", category: "Impostos", costCenter: "taxes", description: "Simples Nacional - Fevereiro", amount: 3800, date: "2025-03-10", recurring: true, frequency: "monthly", vendor: "Receita Federal", paymentMethod: "DARF" },
  { id: "e8", category: "Marketing", costCenter: "marketing", description: "Meta Ads", amount: 2800, date: "2025-03-01", recurring: true, frequency: "monthly", vendor: "Meta", paymentMethod: "Cartão Corporativo" },
  { id: "e9", category: "Operacional", costCenter: "operational", description: "Contabilidade", amount: 950, date: "2025-03-05", recurring: true, frequency: "monthly", vendor: "Contábil Express", paymentMethod: "Boleto" },
  { id: "e10", category: "Tecnologia", costCenter: "technology", description: "Domínios e SSL", amount: 320, date: "2025-03-01", recurring: true, frequency: "yearly", vendor: "Cloudflare", paymentMethod: "Cartão Corporativo" },
];

export const mockTransactions: Transaction[] = [
  { id: "t1", type: "income", category: "Retainer", description: "TechFlow Corp - Retainer Mar/25", amount: 8500, date: "2025-03-03", accountId: "acc1", client: "TechFlow Corp", invoiceId: "INV-001", reconciled: true },
  { id: "t2", type: "income", category: "Assinatura", description: "Nova Digital - Growth Mar/25", amount: 4200, date: "2025-03-02", accountId: "acc1", client: "Nova Digital", invoiceId: "INV-002", reconciled: true },
  { id: "t3", type: "expense", category: "Tecnologia", description: "OpenAI API - Março", amount: 2400, date: "2025-03-01", accountId: "acc2", costCenter: "technology", reconciled: true },
  { id: "t4", type: "expense", category: "Marketing", description: "Google Ads - Março", amount: 3500, date: "2025-03-01", accountId: "acc2", costCenter: "marketing", reconciled: true },
  { id: "t5", type: "expense", category: "Infraestrutura", description: "Coworking - Março", amount: 1200, date: "2025-03-01", accountId: "acc1", costCenter: "infrastructure", reconciled: true },
  { id: "t6", type: "expense", category: "Pessoal", description: "Freelancer Design", amount: 4500, date: "2025-03-05", accountId: "acc1", costCenter: "personnel", reconciled: false },
  { id: "t7", type: "expense", category: "Impostos", description: "Simples Nacional - Fev", amount: 3800, date: "2025-03-10", accountId: "acc1", costCenter: "taxes", reconciled: true },
  { id: "t8", type: "income", category: "Projeto", description: "Startup Hub - Sinal projeto", amount: 6000, date: "2025-03-06", accountId: "acc1", client: "Startup Hub", reconciled: false },
  { id: "t9", type: "expense", category: "Marketing", description: "Meta Ads - Março", amount: 2800, date: "2025-03-01", accountId: "acc2", costCenter: "marketing", reconciled: true },
  { id: "t10", type: "expense", category: "Ferramentas", description: "SaaS Tools - Março", amount: 680, date: "2025-03-01", accountId: "acc2", costCenter: "tools", reconciled: true },
  { id: "t11", type: "transfer", category: "Transferência", description: "CC → Poupança", amount: 10000, date: "2025-03-08", accountId: "acc1", reconciled: true },
  { id: "t12", type: "expense", category: "Operacional", description: "Contabilidade - Março", amount: 950, date: "2025-03-05", accountId: "acc1", costCenter: "operational", reconciled: true },
];

export const mockBankAccounts: BankAccount[] = [
  { id: "acc1", name: "Conta Principal", type: "checking", balance: 87450, institution: "Nubank PJ", lastSync: "2025-03-09" },
  { id: "acc2", name: "Cartão Corporativo", type: "credit", balance: -12630, institution: "Nubank PJ", lastSync: "2025-03-09" },
  { id: "acc3", name: "Reserva", type: "savings", balance: 45000, institution: "Nubank PJ", lastSync: "2025-03-09" },
  { id: "acc4", name: "Investimentos", type: "investment", balance: 120000, institution: "XP Investimentos", lastSync: "2025-03-08" },
];

export const mockCostCenters: CostCenter[] = [
  { id: "cc1", name: "Tecnologia", type: "technology", budget: 8000, spent: 3570, color: "hsl(217, 91%, 60%)" },
  { id: "cc2", name: "Marketing", type: "marketing", budget: 10000, spent: 6300, color: "hsl(38, 92%, 50%)" },
  { id: "cc3", name: "Pessoal", type: "personnel", budget: 25000, spent: 4500, color: "hsl(280, 67%, 55%)" },
  { id: "cc4", name: "Infraestrutura", type: "infrastructure", budget: 3000, spent: 1200, color: "hsl(142, 71%, 45%)" },
  { id: "cc5", name: "Ferramentas", type: "tools", budget: 2000, spent: 680, color: "hsl(190, 80%, 45%)" },
  { id: "cc6", name: "Impostos", type: "taxes", budget: 5000, spent: 3800, color: "hsl(0, 72%, 51%)" },
  { id: "cc7", name: "Operacional", type: "operational", budget: 3000, spent: 950, color: "hsl(45, 80%, 50%)" },
];

export const mockCashFlow: CashFlowEntry[] = [
  { month: "Out/24", income: 74000, expenses: 19500, balance: 54500 },
  { month: "Nov/24", income: 82000, expenses: 21000, balance: 61000 },
  { month: "Dez/24", income: 91000, expenses: 22000, balance: 69000 },
  { month: "Jan/25", income: 105000, expenses: 24000, balance: 81000 },
  { month: "Fev/25", income: 118000, expenses: 25000, balance: 93000 },
  { month: "Mar/25", income: 124000, expenses: 26500, balance: 97500 },
];

export const mockAccountsPayable: AccountPayable[] = [
  { id: "ap1", vendor: "OpenAI", description: "API Usage - Abril", amount: 2400, dueDate: "2025-04-01", status: "pending", category: "technology" },
  { id: "ap2", vendor: "Google", description: "Google Ads - Abril", amount: 3500, dueDate: "2025-04-01", status: "pending", category: "marketing" },
  { id: "ap3", vendor: "WeWork", description: "Coworking - Abril", amount: 1200, dueDate: "2025-04-05", status: "pending", category: "infrastructure" },
  { id: "ap4", vendor: "Meta", description: "Meta Ads - Abril", amount: 2800, dueDate: "2025-04-01", status: "pending", category: "marketing" },
  { id: "ap5", vendor: "AWS", description: "Servidor - Abril", amount: 850, dueDate: "2025-04-01", status: "pending", category: "technology" },
  { id: "ap6", vendor: "Receita Federal", description: "Simples Nacional - Mar", amount: 4200, dueDate: "2025-04-20", status: "pending", category: "taxes" },
  { id: "ap7", vendor: "Freelancer Dev", description: "Sprint Backend", amount: 6000, dueDate: "2025-03-25", status: "overdue", category: "personnel" },
];

export const mockAccountsReceivable: AccountReceivable[] = [
  { id: "ar1", client: "Startup Hub", description: "Desenvolvimento Web + IA", amount: 12000, dueDate: "2025-03-20", status: "pending", invoiceId: "INV-003" },
  { id: "ar2", client: "MegaStore", description: "Chatbot + CRM - Fev/25", amount: 6800, dueDate: "2025-02-28", status: "overdue", invoiceId: "INV-004" },
  { id: "ar3", client: "Fintech Plus", description: "Consultoria IA - Mar/25", amount: 15000, dueDate: "2025-03-25", status: "pending", invoiceId: "INV-005" },
  { id: "ar4", client: "EduTech", description: "Plataforma E-learning", amount: 9500, dueDate: "2025-03-30", status: "pending", invoiceId: "INV-006" },
];

export const mockBudget: Budget = {
  id: "b1",
  name: "Orçamento Março 2025",
  period: "2025-03",
  totalBudget: 56000,
  totalSpent: 21000,
  categories: [
    { name: "Tecnologia", costCenter: "technology", budgeted: 8000, actual: 3570 },
    { name: "Marketing", costCenter: "marketing", budgeted: 10000, actual: 6300 },
    { name: "Pessoal", costCenter: "personnel", budgeted: 25000, actual: 4500 },
    { name: "Infraestrutura", costCenter: "infrastructure", budgeted: 3000, actual: 1200 },
    { name: "Ferramentas", costCenter: "tools", budgeted: 2000, actual: 680 },
    { name: "Impostos", costCenter: "taxes", budgeted: 5000, actual: 3800 },
    { name: "Operacional", costCenter: "operational", budgeted: 3000, actual: 950 },
  ],
};
