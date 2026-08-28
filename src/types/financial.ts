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

// Sem dados de demonstração — Financeiro começa ZERADO (agência e cliente).
// As telas populam a partir de dados reais quando existirem.
export const mockInvoices: Invoice[] = [];
export const mockRevenue: RevenueEntry[] = [];
export const mockSubscriptions: Subscription[] = [];
export const mockExpenses: Expense[] = [];
export const mockTransactions: Transaction[] = [];
export const mockBankAccounts: BankAccount[] = [];
export const mockCostCenters: CostCenter[] = [];
export const mockCashFlow: CashFlowEntry[] = [];
export const mockAccountsPayable: AccountPayable[] = [];
export const mockAccountsReceivable: AccountReceivable[] = [];

export const mockBudget: Budget = {
  id: "b1",
  name: "Orçamento",
  period: "",
  totalBudget: 0,
  totalSpent: 0,
  categories: [],
};
