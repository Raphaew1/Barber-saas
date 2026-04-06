
// Inicializacao do client Supabase usado em toda a aplicacao.
const supabaseLib = window.supabase

if (!supabaseLib) {
  alert('Supabase nao carregou')
  throw new Error('Supabase nao encontrado')
}

const SUPABASE_URL = 'https://kgpsfbuurggwmpcxrfpa.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_gx503U6DBXQbwMujxj9Bog_vthPorxQ'

const supabaseClient = supabaseLib.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)
const statelessSupabaseClientsByToken = new Map()

document.body?.classList.add('app-loading')

function getActiveSupabaseClient(preferredAccessToken = '') {
  const accessToken = preferredAccessToken || lastAuthAccessToken || currentSession?.access_token || ''
  if (accessToken) {
    if (!statelessSupabaseClientsByToken.has(accessToken)) {
      statelessSupabaseClientsByToken.set(accessToken, supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: `sb-stateless-${accessToken.slice(0, 12)}`
        }
      }))
    }

    return statelessSupabaseClientsByToken.get(accessToken)
  }
  return supabaseClient
}
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    currentSession = session ?? currentSession
    lastAuthAccessToken = session?.access_token || lastAuthAccessToken
    clearPlatformContextCache()

    if (typeof showScreen === 'function') {
      showScreen('reset-password')
    }
  }
});

window.updatePassword = async function () {
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  setResetPasswordFeedback('', 'info')

  if (!newPassword || !confirmPassword) {
    setResetPasswordFeedback('Preencha todos os campos.', 'error')
    return;
  }

  if (newPassword !== confirmPassword) {
    setResetPasswordFeedback('As senhas nao coincidem.', 'error')
    return;
  }

  if (newPassword.length < 6) {
    setResetPasswordFeedback('A senha deve ter pelo menos 6 caracteres.', 'error')
    return;
  }

  const { error } = await supabaseClient.auth.updateUser({
    password: newPassword
  });

  if (error) {
    setResetPasswordFeedback(`Erro ao atualizar senha: ${formatAuthErrorMessage(error)}`, 'error')
    return;
  }

  setResetPasswordFeedback('Senha atualizada com sucesso. Agora voce ja pode entrar novamente.', 'success')

  window.setTimeout(() => {
    if (isSignupEntryPage()) {
      window.location.href = getAppUrl('cliente.html')
      return
    }

    mostrarTela('login');
  }, 900)
};

let authUiInitialized = false
let currentSession = null
let lastAuthAccessToken = ''
let currentBarbershopId = null
let currentBarbershopContext = null
window.currentBarbershopContext = null
let currentPortal = null
let managementProductsCache = []
let serviceCatalogCache = []
let purchaseModalProductId = null
let appointmentIdentitySupport = null
let appointmentWorkflowSupport = null
let appointmentSlotsCache = []
let selectedAppointmentDay = null
let selectedAppointmentTime = ''
let agendaViewMode = 'day'
let selectedAgendaDay = null
let customersCrmCache = []
let currentSubscriptionCache = null
let adminAccessDirectoryCache = []
let adminAccessAuditCache = []
let adminPendingApprovalsCache = []
let selectedAdminAccessKey = null
let currentVisibleScreenId = ''
let platformContextCache = null
let adminPasswordModalTarget = null
let adminEditingBarbershopId = null
let isMobileMenuOpen = false
const missingProfileColumnsCache = new Set()
let adminContextStatsCache = {
  usersByBarbershop: new Map(),
  appointmentsByBarbershop: new Map()
}
const ADMIN_EMAIL = 'raphacom.web@gmail.com'
const ADMIN_ROLE = 'admin'
const BARBER_ROLE = 'barbeiro'
const CUSTOMER_ROLE = 'cliente'
const ACCESS_ROLE_MAP = {
  [ADMIN_ROLE]: 'admin',
  [BARBER_ROLE]: 'barber',
  [CUSTOMER_ROLE]: 'client',
  admin: ADMIN_ROLE,
  barber: BARBER_ROLE,
  client: CUSTOMER_ROLE
}
const THEME_STORAGE_KEY = 'barber-saas-theme'
const PORTAL_STORAGE_KEY = 'barber-saas-portal'
const ADMIN_BARBERSHOP_CONTEXT_KEY = 'barber-saas-admin-context'
const APP_ENTRY_MODE = document.body?.dataset?.appEntry || 'main'
const SAAS_PLAN_DEFINITIONS = {
  free: {
    code: 'free',
    label: 'Free',
    monthlyPrice: 0,
    maxAppointmentsPerMonth: 50,
    maxBarbers: 2,
    multiBarbershop: false
  },
  pro: {
    code: 'pro',
    label: 'Pro',
    monthlyPrice: 39,
    maxAppointmentsPerMonth: 400,
    maxBarbers: 8,
    multiBarbershop: false
  },
  premium: {
    code: 'premium',
    label: 'Premium',
    monthlyPrice: 99,
    maxAppointmentsPerMonth: 2000,
    maxBarbers: 30,
    multiBarbershop: true
  }
}
const SCREEN_CONTEXT_MAP = {
  login: {
    kicker: 'Acesso',
    title: 'Entrar na plataforma',
    description: 'Autenticacao com roteamento inteligente entre cliente, barbearia e administracao.'
  },
  signup: {
    kicker: 'Cadastro',
    title: 'Criar conta de cliente',
    description: 'Cadastro simplificado para entrar e acompanhar seus agendamentos.'
  },
  'reset-password': {
    kicker: 'Seguranca',
    title: 'Redefinir senha',
    description: 'Atualize sua senha e retome o acesso com seguranca.'
  },
  agendar: {
    kicker: 'Atendimento',
    title: 'Novo agendamento',
    description: 'Escolha barbeiro, servicos e horario com o contexto da unidade ja aplicado.'
  },
  produtos: {
    kicker: 'Vitrine',
    title: 'Produtos da barbearia',
    description: 'Catalogo com itens disponiveis para venda no contexto da unidade ativa.'
  },
  gestao: {
    kicker: 'Operacao',
    title: 'Indicadores da barbearia',
    description: 'Visao executiva da unidade com vendas, estoque, servicos e saude do plano.'
  },
  agenda: {
    kicker: 'Agenda',
    title: 'Agenda operacional',
    description: 'Acompanhe os atendimentos da barbearia em uma visualizacao clara por horario.'
  },
  cadastros: {
    kicker: 'Configuracao',
    title: 'Cadastros da barbearia',
    description: 'Gerencie clientes, barbeiros, servicos e produtos da unidade selecionada.'
  },
  aprovacoes: {
    kicker: 'Acesso',
    title: 'Aprovacoes do portal',
    description: 'Autorize acessos sensiveis com o contexto correto da barbearia.'
  },
  'admin-dashboard': {
    kicker: 'Master control',
    title: 'Dashboard do administrador',
    description: 'Acompanhe a saude da plataforma, faturamento e operacao das barbearias.'
  },
  'admin-barbershops': {
    kicker: 'Provisionamento',
    title: 'Gerenciar barbearias',
    description: 'Crie unidades, edite identidade da marca e acompanhe o plano de cada operacao.'
  },
  'admin-access': {
    kicker: 'Seguranca',
    title: 'Controle global de acessos',
    description: 'Centralize governanca, aprovacoes e status de usuarios da plataforma.'
  },
  'admin-users': {
    kicker: 'Usuarios',
    title: 'Diretorio global de usuarios',
    description: 'Consulte clientes, barbeiros e administradores com filtros e contexto por unidade.'
  }
}

// Captura erros globais do navegador para facilitar o diagnostico.
window.addEventListener('error', (e) => {
  console.error('Unhandled JS error:', e.message, e.filename, e.lineno)
  alert(`Erro JS: ${e.message}`)
})

// Captura promises rejeitadas que nao tiveram tratamento explicito.
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason)
  alert(`Erro nao tratado: ${e.reason}`)
})

function isAdminEntryPage() {
  return APP_ENTRY_MODE === 'admin'
}

function isSignupEntryPage() {
  return APP_ENTRY_MODE === 'signup'
}

function isClientEntryPage() {
  return APP_ENTRY_MODE === 'client'
}

function isBarberEntryPage() {
  return APP_ENTRY_MODE === 'barber'
}

function isMainPortalLanding() {
  return !isAdminEntryPage()
    && !isClientEntryPage()
    && !isBarberEntryPage()
    && !isSignupEntryPage()
    && !getPortalHintFromUrl()
    && !currentSession
    && !currentBarbershopContext
}

function getAppUrl(fileName = 'index.html') {
  return new URL(fileName, window.location.href).href
}

function getPortalHintFromUrl() {
  const portalHint = new URLSearchParams(window.location.search).get('portal')
  const normalized = normalizePortalRole(portalHint)

  if (normalized === CUSTOMER_ROLE || normalized === BARBER_ROLE || normalized === ADMIN_ROLE) {
    return normalized
  }

  return null
}

function getSlugFromUrl() {
  const path = String(window.location.pathname || '').replace(/^\/+|\/+$/g, '')
  if (!path || ['index.html', 'admin.html', 'signup.html', 'cliente.html', 'barbearia.html'].includes(path.toLowerCase())) {
    return null
  }

  return path.split('/')[0] || null
}

async function loadBarbershopBySlug() {
  const slug = getSlugFromUrl()
  if (!slug) {
    currentBarbershopContext = null
    window.currentBarbershopContext = null
    return null
  }

  const { data, error } = await supabaseClient
    .from('barbershops')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error || !data) {
    console.warn('Barbearia nao encontrada por slug', slug, error?.message || '')
    currentBarbershopContext = null
    window.currentBarbershopContext = null
    return null
  }

  currentBarbershopContext = data
  currentBarbershopId = data.id || currentBarbershopId
  window.currentBarbershopContext = data
  return data
}

function applyBranding(barbershop) {
  if (!barbershop) {
    return
  }

  currentBarbershopContext = barbershop
  window.currentBarbershopContext = barbershop

  document.documentElement.style.setProperty('--primary-top', barbershop.primary_color || '#ffffff')
  document.documentElement.style.setProperty('--secondary-top', barbershop.secondary_color || '#000000')

  document.querySelectorAll('.brand-name').forEach((element) => {
    element.textContent = barbershop.name
  })

  document.querySelectorAll('.sidebar-brand h2, .content-topbar h3').forEach((element) => {
    element.textContent = barbershop.name || element.textContent
  })

  if (barbershop.logo_url) {
    document.querySelectorAll('img.brand-logo').forEach((element) => {
      element.src = barbershop.logo_url
      element.alt = barbershop.name || 'Logo da barbearia'
    })
  }
}

function isClientPublicView() {
  return !!currentBarbershopContext && !currentSession
}

function getCurrentBarbershopContextId() {
  return currentBarbershopContext?.id || null
}

function updateClientPublicViewUi() {
  const publicView = isClientPublicView()
  const sidebar = document.querySelector('.sidebar')
  const content = document.querySelector('.content')
  const topbarIdentity = document.getElementById('topbar-user-identity')
  const adminContext = document.getElementById('admin-context-switcher')

  document.body.dataset.publicTenant = publicView ? 'true' : 'false'

  if (sidebar) {
    sidebar.style.display = publicView ? 'none' : ''
  }

  if (content) {
    content.style.width = publicView ? '100%' : ''
    content.style.maxWidth = publicView ? 'none' : ''
  }

  if (topbarIdentity && publicView) {
    topbarIdentity.style.display = 'none'
  }

  if (adminContext && publicView) {
    adminContext.style.display = 'none'
  }
}

function getAuthCallbackParam(paramName) {
  const hashParams = new URLSearchParams(String(window.location.hash || '').replace(/^#/, ''))
  const searchParams = new URLSearchParams(window.location.search || '')
  return searchParams.get(paramName) || hashParams.get(paramName) || ''
}

function isSignupConfirmationLanding() {
  return getAuthCallbackParam('type') === 'signup'
}

function clearAuthCallbackParams() {
  if (!window.history?.replaceState) {
    return
  }

  const cleanUrl = new URL(window.location.href)
  cleanUrl.search = ''
  cleanUrl.hash = ''
  window.history.replaceState({}, document.title, cleanUrl.href)
}

function redirectToPortalEntry(portal) {
  const target = portal === 'admin'
    ? 'admin.html'
    : portal === BARBER_ROLE
      ? 'barbearia.html'
    : portal === CUSTOMER_ROLE
      ? 'cliente.html'
      : 'index.html'
  window.location.href = getAppUrl(target)
}

window.voltarParaTelaInicial = async function () {
  if (isClientPublicView()) {
    currentPortal = 'cliente'
    applyPortalUi()
    showScreen('agendar')
    await carregarPortalData('agendar')
    return
  }

  if (isSignupEntryPage()) {
    window.location.href = getAppUrl('index.html')
    return
  }

  if (isClientEntryPage()) {
    const isLoggedIn = await hasActiveSession()

    if (!isLoggedIn) {
      setPortal('cliente')
      applyPortalUi()
      showScreen('login')
      return
    }

    setPortal('cliente')
    applyPortalUi()
    showScreen('agendar')
    await carregarPortalData('agendar')
    return
  }

  if (isBarberEntryPage()) {
    const isLoggedIn = await hasActiveSession()

    if (!isLoggedIn) {
      setPortal('barbeiro')
      applyPortalUi()
      showScreen('login')
      return
    }

    setPortal('barbeiro')
    applyPortalUi()
    showScreen('gestao')
    await carregarPortalData('gestao')
    return
  }

  if (isAdminEntryPage()) {
    const isLoggedIn = await hasActiveSession()

    if (!isLoggedIn) {
      showScreen('login')
      return
    }

    showScreen('admin-dashboard')
    await carregarPortalData('admin-dashboard')
    return
  }

  const isLoggedIn = await hasActiveSession()

  if (!isLoggedIn) {
    currentPortal = null
    localStorage.removeItem(PORTAL_STORAGE_KEY)
    applyPortalUi()
    showScreen('login')
    return
  }

  const homeScreen = getDefaultScreenForPortal()
  showScreen(homeScreen)
  await carregarPortalData(homeScreen)
}

function isMissingColumnError(error, columnNames = []) {
  const message = String(error?.message || '').toLowerCase()
  return columnNames.some((columnName) => message.includes(String(columnName || '').toLowerCase()))
}

function isMissingTableError(error, tableName) {
  const message = String(error?.message || '').toLowerCase()
  const normalizedTableName = String(tableName || '').toLowerCase()
  const status = Number(error?.status || error?.statusCode || 0)

  return (
    status === 404 ||
    message.includes(`relation "public.${normalizedTableName}" does not exist`) ||
    message.includes(`relation "${normalizedTableName}" does not exist`) ||
    message.includes(`could not find the table '${normalizedTableName}'`) ||
    message.includes(`could not find the table 'public.${normalizedTableName}'`)
  )
}

function isMissingTableFunctionError(error, tableName) {
  const normalizedMessage = [
    error?.message,
    error?.payload?.error,
    error?.payload?.message,
    error?.responseText
  ].filter(Boolean).join(' | ')

  return isMissingTableError({ ...error, message: normalizedMessage }, tableName)
}

function createMissingTableResult(error) {
  return {
    data: [],
    error,
    missingTable: true
  }
}

function normalizeMissingTableResult(result, tableName) {
  if (result?.error && isMissingTableError(result.error, tableName)) {
    return createMissingTableResult(result.error)
  }

  return result
}

function isConflictError(error) {
  return Number(error?.status) === 409 || String(error?.code || '') === '23505'
}

function normalizePortalRole(role) {
  const normalizedRole = String(role || '').trim().toLowerCase()
  return ACCESS_ROLE_MAP[normalizedRole] || CUSTOMER_ROLE
}

function normalizeAccessRole(role) {
  const normalizedRole = String(role || '').trim().toLowerCase()
  if (normalizedRole === 'admin' || normalizedRole === 'barber' || normalizedRole === 'client') {
    return normalizedRole
  }

  return ACCESS_ROLE_MAP[normalizedRole] || 'client'
}

function getBarbershopConflictMessage(error) {
  const message = String(error?.message || '').toLowerCase()
  const details = String(error?.details || '').toLowerCase()
  const combined = `${message} ${details}`

  if (combined.includes('owner_id')) {
    return 'Este responsavel ja esta vinculado a outra barbearia. Use outro email de responsavel ou ajuste a regra da tabela no Supabase.'
  }

  if (combined.includes('email')) {
    return 'Ja existe uma barbearia cadastrada com este email.'
  }

  if (combined.includes('slug')) {
    return 'Ja existe uma barbearia cadastrada com este slug.'
  }

  if (combined.includes('name')) {
    return 'Ja existe uma barbearia cadastrada com este nome.'
  }

  if (combined.includes('id')) {
    return 'Conflito ao gerar o identificador da barbearia. Tente novamente.'
  }

  return error?.message || 'Conflito ao criar a barbearia.'
}

function generateRecordId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }

  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizePlanCode(planCode) {
  const code = String(planCode || 'free').trim().toLowerCase()
  return SAAS_PLAN_DEFINITIONS[code] ? code : 'free'
}

function getPlanDefinition(planCode) {
  return SAAS_PLAN_DEFINITIONS[normalizePlanCode(planCode)]
}

function normalizeBarbershopSlugInput(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildPlanBadge(planCode) {
  const plan = getPlanDefinition(planCode)
  return `${plan.label} · ${formatCurrency(plan.monthlyPrice)}/mes`
}

function getCurrentMonthRange() {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  end.setMilliseconds(-1)

  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
}

function inferToastTypeFromMessage(message) {
  const normalizedMessage = String(message || '').toLowerCase()

  if (normalizedMessage.includes('sucesso') || normalizedMessage.includes('ok') || normalizedMessage.includes('criada')) {
    return 'success'
  }

  if (normalizedMessage.includes('erro') || normalizedMessage.includes('inval') || normalizedMessage.includes('falh') || normalizedMessage.includes('indispon')) {
    return 'error'
  }

  return 'info'
}

function formatAuthErrorMessage(error, context = {}) {
  const rawMessage = String(error?.message || '').trim()
  const normalizedMessage = rawMessage.toLowerCase()
  const email = String(context?.email || '').trim().toLowerCase()
  const isMasterAdmin = isAdminEmail(email)

  if (!rawMessage) {
    return 'Nao foi possivel concluir a autenticacao. Tente novamente.'
  }

  if (normalizedMessage.includes('invalid login credentials')) {
    if (isMasterAdmin) {
      return 'Email ou senha invalidos para a conta administradora. Se esta conta master ja existe, use "Esqueci minha senha". Se ela ainda nao existe no Supabase Auth, crie o usuario primeiro em Authentication > Users.'
    }

    return 'Email ou senha invalidos. Revise os dados e tente novamente.'
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'Seu email ainda nao foi confirmado. Verifique sua caixa de entrada antes de entrar.'
  }

  if (normalizedMessage.includes('user already registered')) {
    return 'Ja existe uma conta com este email. Use a tela de login ou redefina sua senha.'
  }

  if (normalizedMessage.includes('password should be at least')) {
    return 'A senha deve ter pelo menos 6 caracteres.'
  }

  if (normalizedMessage.includes('unable to validate email address') || normalizedMessage.includes('invalid email')) {
    return 'Informe um email valido para continuar.'
  }

  if (normalizedMessage.includes('signup is disabled')) {
    return 'O cadastro de novas contas esta desativado no Supabase.'
  }

  if (normalizedMessage.includes('too many requests')) {
    return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.'
  }

  return rawMessage
}

function ensureToastContainer() {
  let container = document.getElementById('app-toast-stack')

  if (container) {
    return container
  }

  container = document.createElement('div')
  container.id = 'app-toast-stack'
  container.className = 'app-toast-stack'
  document.body.appendChild(container)
  return container
}

function showAppToast(message, type = 'info') {
  const container = ensureToastContainer()
  const toast = document.createElement('div')

  toast.className = `app-toast app-toast-${type}`
  toast.textContent = String(message || '')
  container.appendChild(toast)

  window.setTimeout(() => {
    toast.remove()
  }, 3600)
}

function setAuthFeedback(message = '', type = 'info') {
  const feedback = document.getElementById('auth-feedback')
  if (!feedback) {
    if (message) {
      showAppToast(message, type)
    }
    return
  }

  if (!message) {
    feedback.textContent = ''
    feedback.className = 'form-feedback'
    feedback.style.display = 'none'
    return
  }

  feedback.textContent = message
  feedback.className = `form-feedback form-feedback-${type}`
  feedback.style.display = 'block'
}

function showFormFeedback(message = '', type = 'info', feedbackId = 'admin-user-create-feedback') {
  const feedback = document.getElementById(feedbackId)
  if (!feedback) {
    if (message) {
      showAppToast(message, type)
    }
    return
  }

  if (!message) {
    feedback.textContent = ''
    feedback.className = 'form-feedback'
    feedback.style.display = 'none'
    return
  }

  feedback.textContent = message
  feedback.className = `form-feedback form-feedback-${type}`
  feedback.style.display = 'block'
}

function setAuthLoading(isLoading) {
  const loginButton = document.getElementById('login-submit')
  const signupButton = document.getElementById('signup-submit')

  if (loginButton) {
    loginButton.disabled = isLoading
    loginButton.textContent = isLoading ? 'Entrando...' : 'Entrar'
  }

  if (signupButton) {
    signupButton.disabled = isLoading
    signupButton.textContent = isLoading ? 'Criando conta...' : 'Criar conta'
  }
}

function bindEnterSubmit(inputIds, action) {
  inputIds.forEach((inputId) => {
    const input = document.getElementById(inputId)
    if (!input || input.dataset.enterBound === 'true') {
      return
    }

    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return
      }

      event.preventDefault()
      action()
    })

    input.dataset.enterBound = 'true'
  })
}

function setResetPasswordFeedback(message = '', type = 'info') {
  const feedback = document.getElementById('reset-password-feedback')
  if (!feedback) {
    if (message) {
      showAppToast(message, type)
    }
    return
  }

  if (!message) {
    feedback.textContent = ''
    feedback.className = 'form-feedback'
    feedback.style.display = 'none'
    return
  }

  feedback.textContent = message
  feedback.className = `form-feedback form-feedback-${type}`
  feedback.style.display = 'block'
}

window.alert = function (message) {
  showAppToast(message, inferToastTypeFromMessage(message))
}

async function upsertProfileRecord(profile) {
  const client = getActiveSupabaseClient()
  const minimalPayload = {
    id: profile.id,
    email: profile.email
  }

  if (profile.role) {
    minimalPayload.role = profile.role
  }

  if (profile.barbershop_id) {
    minimalPayload.barbershop_id = profile.barbershop_id
  }

  if (profile.plan_code) {
    minimalPayload.plan_code = normalizePlanCode(profile.plan_code)
  }

  const basePayload = {
    ...minimalPayload
  }

  if (profile.global_role) {
    basePayload.global_role = profile.global_role
  }

  if (profile.status) {
    basePayload.status = profile.status
  }

  const payloadWithOptionalFields = {
    ...basePayload,
    ...(profile.name ? { name: profile.name } : {}),
    ...(profile.phone ? { phone: profile.phone } : {})
  }

  let result = await client
    .from('profiles')
    .upsert([payloadWithOptionalFields], { onConflict: 'id' })

  if (result.error && isMissingColumnError(result.error, ['name', 'phone', 'global_role', 'status', 'role', 'barbershop_id', 'plan_code'])) {
    const fallbackPayload = {
      id: profile.id,
      email: profile.email
    }

    result = await client
      .from('profiles')
      .upsert([fallbackPayload], { onConflict: 'id' })
  }

  return result
}

async function updateProfileRecordWithFallback(profileId, updatePayload, optionalColumns = ['name', 'phone', 'global_role', 'status', 'role', 'barbershop_id', 'plan_code']) {
  if (!profileId) {
    return { error: new Error('Perfil nao informado.') }
  }

  let payload = Object.entries(updatePayload || {}).reduce((accumulator, [key, value]) => {
    if (value !== undefined) {
      accumulator[key] = value
    }
    return accumulator
  }, {})

  optionalColumns.forEach((columnName) => {
    if (missingProfileColumnsCache.has(columnName)) {
      delete payload[columnName]
    }
  })

  if (!Object.keys(payload).length) {
    return { error: null }
  }

  while (Object.keys(payload).length) {
    const result = await supabaseClient
      .from('profiles')
      .update(payload)
      .eq('id', profileId)

    if (!result.error) {
      return result
    }

    const missingColumn = optionalColumns.find((columnName) => Object.prototype.hasOwnProperty.call(payload, columnName) && isMissingColumnError(result.error, [columnName]))
    if (!missingColumn) {
      return result
    }

    missingProfileColumnsCache.add(missingColumn)
    delete payload[missingColumn]
  }

  return { error: null }
}

async function syncManagedUserAccess(targetUserId, barbershopId, role, status) {
  const result = await invokeProtectedFunction('admin-update-user-access', {
    targetUserId,
    barbershopId,
    role,
    status
  }, {
    authErrorMessage: 'Sua sessao de administrador expirou. Faca login novamente para atualizar os acessos.'
  })

  if (result.error) {
    if (isMissingTableFunctionError(result.error, 'user_access')) {
      return { data: null, error: null, skippedMissingTable: true }
    }

    return result
  }

  if (result.data?.error && isMissingTableError({ message: result.data.error }, 'user_access')) {
    return { data: null, error: null, skippedMissingTable: true }
  }

  return result
}

function isProfilesRlsError(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('row-level security') || message.includes('violates row-level security policy')
}

function isUnauthorizedError(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('unauthorized') || message.includes('jwt') || error?.status === 401 || error?.code === '401'
}

async function createBarbershopRecord(barbershop) {
  const generatedId = generateRecordId()
  const basePayload = {
    id: generatedId,
    name: barbershop.name,
    owner_id: barbershop.owner_id || null
  }

  const payloadWithOptionalFields = {
    ...basePayload,
    ...(barbershop.phone ? { phone: barbershop.phone } : {}),
    ...(barbershop.email ? { email: barbershop.email } : {})
  }

  let insertPayload = payloadWithOptionalFields
  let result = await supabaseClient
    .from('barbershops')
    .insert([insertPayload])

  if (result.error && isMissingColumnError(result.error, ['phone', 'email'])) {
    insertPayload = basePayload
    result = await supabaseClient
      .from('barbershops')
      .insert([insertPayload])
  }

  if (result.error && isMissingColumnError(result.error, ['id'])) {
    const payloadWithoutId = { ...insertPayload }
    delete payloadWithoutId.id

    result = await supabaseClient
      .from('barbershops')
      .insert([payloadWithoutId])

    if (!result.error) {
      return {
        data: payloadWithoutId,
        error: null
      }
    }
  }

  if (result.error) {
    return {
      data: null,
      error: result.error
    }
  }

  return {
    data: insertPayload,
    error: null
  }
}

async function createAdminBarbershopProvision(payload) {
  const executeInvoke = async () => {
    try {
      const { accessToken } = await getSessionAccessToken()
      const requestHeaders = {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY
      }

      if (accessToken) {
        requestHeaders.Authorization = `Bearer ${accessToken}`
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-barbershop`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(payload || {})
      })

      const responseText = await response.text()
      let data = null

      try {
        data = responseText ? JSON.parse(responseText) : null
      } catch (_parseError) {
        data = null
      }

      if (!response.ok) {
        const functionError = new Error(
          String(data?.error || data?.message || response.statusText || 'Erro na criação da barbearia')
        )
        functionError.status = response.status
        functionError.payload = data
        functionError.responseText = responseText
        return {
          data: null,
          error: functionError
        }
      }

      return {
        data: data,
        error: null
      }
    } catch (networkError) {
      return {
        data: null,
        error: networkError
      }
    }
  }

  return await executeInvoke()
}

async function fetchAdminAppointmentsSummary() {
  let result = await supabaseClient
    .from('appointments')
    .select('id, customer_name, appointment_time, barbershop_id, barbershops(name)')
    .order('appointment_time', { ascending: false })
    .limit(8)

  if (result.error && isMissingTableError(result.error, 'appointments')) {
    return createMissingTableResult(result.error)
  }

  if (result.error) {
    result = await supabaseClient
      .from('appointments')
      .select('id, customer_name, appointment_time, barbershop_id')
      .order('appointment_time', { ascending: false })
      .limit(8)
  }

  return normalizeMissingTableResult(result, 'appointments')
}

async function fetchAdminSubscriptionsSummary() {
  let result = await supabaseClient
    .from('saas_subscriptions')
    .select('barbershop_id, plan_code, status, billing_provider')

  if (result.error && isMissingTableError(result.error, 'saas_subscriptions')) {
    return {
      data: [],
      error: result.error,
      missingTable: true
    }
  }

  if (result.error && isMissingColumnError(result.error, ['billing_provider'])) {
    result = await supabaseClient
      .from('saas_subscriptions')
      .select('barbershop_id, plan_code, status')
  }

  return result
}

async function getSessionAccessToken() {
  if (currentSession?.access_token) {
    return {
      accessToken: String(currentSession.access_token).trim(),
      error: null
    }
  }

  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession()
  if (sessionError) {
    return {
      accessToken: '',
      error: new Error(`Nao foi possivel validar sua sessao: ${sessionError.message}`)
    }
  }

  if (sessionData?.session?.access_token) {
    currentSession = sessionData.session
    lastAuthAccessToken = String(sessionData.session.access_token).trim()
    return {
      accessToken: lastAuthAccessToken,
      error: null
    }
  }

  if (lastAuthAccessToken) {
    return {
      accessToken: String(lastAuthAccessToken).trim(),
      error: null
    }
  }

  const sessionState = await ensureValidSessionState()
  if (sessionState.error && !sessionState.session) {
    return {
      accessToken: '',
      error: new Error(`Nao foi possivel validar sua sessao: ${sessionState.error.message}`)
    }
  }

  return {
    accessToken: String(sessionState.session?.access_token || currentSession?.access_token || '').trim(),
    error: null
  }
}

async function refreshSessionAccessToken() {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.refreshSession()

  if (sessionError) {
    return {
      accessToken: '',
      error: new Error(`Nao foi possivel renovar sua sessao: ${sessionError.message}`)
    }
  }

  currentSession = sessionData?.session ?? currentSession
  lastAuthAccessToken = sessionData?.session?.access_token || lastAuthAccessToken
  clearPlatformContextCache()

  return {
    accessToken: sessionData?.session?.access_token || '',
    error: null
  }
}

function isInvalidJwtFunctionError(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('invalid jwt') || message.includes('jwt')
}

function isInvalidJwtAuthError(error) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes('invalid jwt') || message.includes('jwt malformed') || message.includes('jwt expired')
}

async function resetInvalidSession(message = 'Sua sessao expirou. Faca login novamente.') {
  try {
    await supabaseClient.auth.signOut({ scope: 'local' })
  } catch (_error) {
  }

  currentSession = null
  lastAuthAccessToken = ''
  currentBarbershopId = null
  clearPlatformContextCache()

  if (isAdminEntryPage()) {
    setPortal('admin')
  } else if (isSignupEntryPage()) {
    currentPortal = 'cliente'
  } else {
    currentPortal = null
    localStorage.removeItem(PORTAL_STORAGE_KEY)
  }

  updateProtectedUi(false)
  applyPortalUi()

  if (currentBarbershopContext) {
    currentPortal = 'cliente'
    showScreen('agendar')
    await carregarPortalData('agendar')
    return
  }

  showScreen(isSignupEntryPage() ? 'signup' : 'login')
  setAuthFeedback(message, 'error')
}

async function ensureValidSessionState() {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession()

  if (sessionError) {
    console.error('Erro ao carregar sessao', sessionError)
    return { session: null, user: null, error: sessionError }
  }

  let session = sessionData?.session ?? null
  if (!session) {
    currentSession = null
    lastAuthAccessToken = ''
    return { session: null, user: null, error: null }
  }

  let userResult = await supabaseClient.auth.getUser()
  if (userResult.error && isInvalidJwtAuthError(userResult.error)) {
    const refreshed = await supabaseClient.auth.refreshSession()
    if (!refreshed.error && refreshed.data?.session) {
      currentSession = refreshed.data.session
      lastAuthAccessToken = refreshed.data.session.access_token || lastAuthAccessToken
      clearPlatformContextCache()
      session = refreshed.data.session
      userResult = await supabaseClient.auth.getUser()
    }
  }

  if (userResult.error) {
    if (isInvalidJwtAuthError(userResult.error)) {
      await resetInvalidSession('Sua sessao expirou. Faca login novamente.')
      return { session: null, user: null, error: userResult.error }
    }

    console.error('Erro ao validar usuario autenticado', userResult.error)
    currentSession = session
    lastAuthAccessToken = session?.access_token || lastAuthAccessToken
    return { session, user: null, error: userResult.error }
  }

  currentSession = session
  lastAuthAccessToken = session?.access_token || lastAuthAccessToken
  return {
    session,
    user: userResult.data?.user ?? session.user ?? null,
    error: null
  }
}

async function invokeProtectedFunction(functionName, body, options = {}) {
  const { authErrorMessage = 'Sua sessao expirou. Faca login novamente.', headers = {} } = options
  const executeInvoke = async (accessToken) => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          ...headers
        },
        body: JSON.stringify(body || {})
      })

      const responseText = await response.text()
      let payload = null

      try {
        payload = responseText ? JSON.parse(responseText) : null
      } catch (_parseError) {
        payload = null
      }

      if (!response.ok) {
        const functionError = new Error(
          String(payload?.error || payload?.message || response.statusText || 'Edge Function returned a non-2xx status code')
        )
        functionError.status = response.status
        functionError.payload = payload
        functionError.responseText = responseText
        return {
          data: null,
          error: functionError
        }
      }

      return {
        data: payload,
        error: null
      }
    } catch (networkError) {
      return {
        data: null,
        error: networkError
      }
    }
  }

  let { accessToken, error: tokenError } = await getSessionAccessToken()

  if (tokenError) {
    return {
      data: null,
      error: tokenError
    }
  }

  if (!accessToken) {
    return {
      data: null,
      error: new Error(authErrorMessage)
    }
  }

  let result = await executeInvoke(accessToken)

  if (!result.error || !isInvalidJwtFunctionError(result.error)) {
    return result
  }

  const refreshedTokenResult = await refreshSessionAccessToken()
  if (refreshedTokenResult.error || !refreshedTokenResult.accessToken) {
    await resetInvalidSession(authErrorMessage)
    return {
      data: null,
      error: refreshedTokenResult.error || new Error(authErrorMessage)
    }
  }

  result = await executeInvoke(refreshedTokenResult.accessToken)
  if (result.error && isInvalidJwtFunctionError(result.error)) {
    await resetInvalidSession(authErrorMessage)
    return {
      data: null,
      error: new Error(authErrorMessage)
    }
  }

  return result
}

async function extractFunctionErrorMessage(error, fallbackMessage = 'Nao foi possivel concluir a operacao.') {
  if (!error) {
    return fallbackMessage
  }

  if (error.payload?.error) {
    return String(error.payload.error)
  }

  if (error.payload?.message) {
    return String(error.payload.message)
  }

  if (error.context && typeof error.context.json === 'function') {
    try {
      const payload = await error.context.json()
      if (payload?.error) {
        return String(payload.error)
      }

      if (payload?.message) {
        return String(payload.message)
      }
    } catch (_parseError) {
    }
  }

  return String(error.message || fallbackMessage)
}

async function fetchSaasSubscription(barbershopId) {
  if (!barbershopId) {
    return { data: null, error: null }
  }

  const { data, error } = await supabaseClient
    .from('saas_subscriptions')
    .select('id, barbershop_id, plan_code, status, billing_provider, created_at')
    .eq('barbershop_id', barbershopId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    if (isMissingTableError(error, 'saas_subscriptions')) {
      return {
        data: null,
        error: null,
        missingTable: true
      }
    }

    return { data: null, error }
  }

  return {
    data: data || null,
    error: null
  }
}

async function ensureSaasSubscription(barbershopId, planCode = 'free') {
  const normalizedPlanCode = normalizePlanCode(planCode)
  const existing = await fetchSaasSubscription(barbershopId)

  if (existing.error || existing.missingTable || existing.data?.id) {
    return existing
  }

  const payload = {
    barbershop_id: barbershopId,
    plan_code: normalizedPlanCode,
    status: 'active',
    billing_provider: 'manual'
  }

  const { data, error } = await supabaseClient
    .from('saas_subscriptions')
    .insert([payload])
    .select('id, barbershop_id, plan_code, status, billing_provider, created_at')
    .maybeSingle()

  return {
    data: data || payload,
    error
  }
}

async function saveSaasSubscriptionPlan(barbershopId, planCode = 'free') {
  const normalizedPlanCode = normalizePlanCode(planCode)
  const existing = await fetchSaasSubscription(barbershopId)

  if (existing.error || existing.missingTable) {
    return existing
  }

  if (!existing.data?.id) {
    return ensureSaasSubscription(barbershopId, normalizedPlanCode)
  }

  const { data, error } = await supabaseClient
    .from('saas_subscriptions')
    .update({
      plan_code: normalizedPlanCode,
      status: 'active',
      billing_provider: existing.data.billing_provider || 'manual'
    })
    .eq('id', existing.data.id)
    .select('id, barbershop_id, plan_code, status, billing_provider, created_at')
    .maybeSingle()

  return {
    data: data || existing.data,
    error
  }
}

async function getPlanUsage(barbershopId) {
  const subscriptionResult = await fetchSaasSubscription(barbershopId)
  const plan = getPlanDefinition(subscriptionResult.data?.plan_code || 'free')
  const monthRange = getCurrentMonthRange()

  const [appointmentsResult, barbersResult] = await Promise.all([
    supabaseClient
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('barbershop_id', barbershopId)
      .gte('appointment_time', monthRange.start)
      .lte('appointment_time', monthRange.end),
    supabaseClient
      .from('barbers')
      .select('id', { count: 'exact', head: true })
      .eq('barbershop_id', barbershopId)
  ])

  return {
    subscription: subscriptionResult.data || null,
    plan,
    appointmentsCount: appointmentsResult.count || 0,
    barbersCount: barbersResult.count || 0,
    appointmentsError: appointmentsResult.error || null,
    barbersError: barbersResult.error || null,
    subscriptionError: subscriptionResult.error || null,
    missingSubscriptionTable: !!subscriptionResult.missingTable
  }
}

async function canCreateAppointment(barbershopId, quantity = 1) {
  const usage = await getPlanUsage(barbershopId)

  if (usage.subscriptionError || usage.appointmentsError) {
    return {
      allowed: true,
      usage
    }
  }

  if ((usage.appointmentsCount + quantity) > usage.plan.maxAppointmentsPerMonth) {
    return {
      allowed: false,
      usage,
      message: `O plano ${usage.plan.label} permite ate ${usage.plan.maxAppointmentsPerMonth} agendamento(s) por mes. Faca upgrade para continuar.`
    }
  }

  return {
    allowed: true,
    usage
  }
}

async function canCreateBarber(barbershopId) {
  const usage = await getPlanUsage(barbershopId)

  if (usage.subscriptionError || usage.barbersError) {
    return {
      allowed: true,
      usage
    }
  }

  if ((usage.barbersCount + 1) > usage.plan.maxBarbers) {
    return {
      allowed: false,
      usage,
      message: `O plano ${usage.plan.label} permite ate ${usage.plan.maxBarbers} barbeiro(s). Faca upgrade para cadastrar mais profissionais.`
    }
  }

  return {
    allowed: true,
    usage
  }
}

function getAdminBarbershopContext() {
  const savedContext = localStorage.getItem(ADMIN_BARBERSHOP_CONTEXT_KEY)
  return savedContext || null
}

function setAdminBarbershopContext(barbershopId) {
  if (barbershopId) {
    localStorage.setItem(ADMIN_BARBERSHOP_CONTEXT_KEY, barbershopId)
  } else {
    localStorage.removeItem(ADMIN_BARBERSHOP_CONTEXT_KEY)
  }

  currentBarbershopId = barbershopId || null
  updateAdminContextUi()
}

function getTenantPortalMessage(defaultMessage) {
  if (currentPortal === 'admin') {
    return 'Selecione uma barbearia no contexto do administrador para visualizar estes dados.'
  }

  return defaultMessage
}

function formatOptionalContactLine(label, value) {
  return value ? `${label}: ${value}` : null
}

function formatAdminDate(value, fallback = 'Sem registro') {
  if (!value) {
    return fallback
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return fallback
  }

  return date.toLocaleString('pt-BR')
}

function getAccessStatusMeta(status) {
  if (status === 'active') {
    return { label: 'Ativo', className: 'status-active' }
  }

  if (status === 'blocked') {
    return { label: 'Bloqueado', className: 'status-blocked' }
  }

  return { label: 'Pendente', className: 'status-pending' }
}

function getRoleBadgeMeta(role) {
  const normalizedRole = normalizePortalRole(role)

  if (normalizedRole === ADMIN_ROLE) {
    return { label: 'Admin', className: 'role-admin' }
  }

  if (normalizedRole === BARBER_ROLE) {
    return { label: 'Barbearia', className: 'role-barber' }
  }

  return { label: 'Cliente', className: 'role-client' }
}

function getPortalPermissionsByRole(role) {
  const portalPermissions = {
    cliente: ['agendar', 'produtos'],
    barbeiro: ['gestao', 'agenda', 'cadastros'],
    admin: ['agendar', 'produtos', 'gestao', 'agenda', 'cadastros', 'admin-dashboard', 'admin-barbershops', 'admin-access', 'aprovacoes', 'admin-users']
  }

  return portalPermissions[normalizePortalRole(role)] || []
}

function setAdminAccessLoading(isLoading, message = 'Carregando diretorio de acessos...') {
  const loading = document.getElementById('admin-access-loading')
  const list = document.getElementById('admin-access-list')

  if (loading) {
    loading.style.display = isLoading ? 'block' : 'none'
    loading.textContent = message
  }

  if (list) {
    list.style.opacity = isLoading ? '0.55' : '1'
  }
}

function setAdminAccessEditorFeedback(message = '', type = 'info') {
  const feedback = document.getElementById('admin-access-editor-feedback')
  if (!feedback) {
    if (message) {
      showAppToast(message, type)
    }
    return
  }

  if (!message) {
    feedback.style.display = 'none'
    feedback.textContent = ''
    feedback.className = 'form-feedback'
    return
  }

  feedback.style.display = 'block'
  feedback.textContent = message
  feedback.className = `form-feedback form-feedback-${type}`
}

function addAdminAccessAuditEntry(entry) {
  const payload = {
    created_at: new Date().toISOString(),
    ...entry
  }

  adminAccessAuditCache.unshift(payload)

  adminAccessAuditCache = adminAccessAuditCache.slice(0, 20)
  renderAdminAccessAuditLog()

  supabaseClient
    .from('access_audit_logs')
    .insert([{
      action: payload.action || 'Atualizacao de acesso',
      target_email: payload.target_email || null,
      performed_by_email: payload.performed_by_email || null,
      details: payload.details || null,
      created_at: payload.created_at
    }])
    .then(() => {})
    .catch(() => {})
}

function updateTopbarUserIdentity() {
  const wrapper = document.getElementById('topbar-user-identity')
  const label = document.querySelector('#topbar-user-identity .topbar-user-label')
  const value = document.getElementById('topbar-user-value')
  const meta = document.getElementById('topbar-user-meta')
  const sidebarWrapper = document.getElementById('sidebar-user-identity')
  const sidebarValue = document.getElementById('sidebar-user-value')
  const sidebarMeta = document.getElementById('sidebar-user-meta')
  const sidebarAvatar = document.querySelector('#sidebar-user-identity .sidebar-user-avatar')

  if (!wrapper || !value) {
    return
  }

  const user = currentSession?.user
  if (!user) {
    wrapper.style.display = 'none'
    value.textContent = '-'
    if (meta) {
      meta.textContent = ''
    }
    if (sidebarWrapper) {
      sidebarWrapper.style.display = 'none'
    }
    if (sidebarValue) {
      sidebarValue.textContent = 'Conta'
    }
    if (sidebarMeta) {
      sidebarMeta.textContent = 'Sem sessao'
    }
    return
  }

  const portalLabel = getCurrentPortalLabel()
  const profileName = String(platformContextCache?.name || '').trim()
  const displayValue = profileName || user.user_metadata?.name || user.email || user.id || 'Usuario autenticado'
  const shortId = user.id ? String(user.id).slice(0, 8) : ''
  const displayName = displayValue
  const avatarText = String(displayName).trim().slice(0, 2).toUpperCase()

  wrapper.style.display = 'inline-flex'
  if (label) {
    label.textContent = portalLabel
  }
  value.textContent = displayValue
  if (meta) {
    meta.textContent = user.email && shortId ? `${user.email} · ID: ${shortId}` : (user.id || '')
  }
  wrapper.title = user.id && user.email ? `Email: ${user.email}\nID: ${user.id}` : displayValue

  if (sidebarWrapper) {
    sidebarWrapper.style.display = 'flex'
  }
  if (sidebarValue) {
    sidebarValue.textContent = displayName
  }
  if (sidebarMeta) {
    sidebarMeta.textContent = `${portalLabel}${user.email ? ` · ${user.email}` : ''}`
  }
  if (sidebarAvatar) {
    sidebarAvatar.textContent = avatarText || 'CF'
  }
}

function getCurrentPortalLabel() {
  if (isClientPublicView()) {
    return 'Cliente'
  }

  if (currentPortal === ADMIN_ROLE) {
    return 'Administrador'
  }

  if (currentPortal === BARBER_ROLE) {
    return 'Barbearia'
  }

  if (currentPortal === CUSTOMER_ROLE) {
    return 'Cliente'
  }

  return 'Usuario'
}

function getCurrentTopbarContextLabel() {
  if (currentBarbershopContext?.name) {
    return currentBarbershopContext.name
  }

  const adminContextSelect = document.getElementById('admin-active-barbershop')
  const selectedOption = adminContextSelect?.selectedOptions?.[0]
  if (selectedOption?.value) {
    return selectedOption.textContent.split('·')[0].trim()
  }

  if (currentPortal === ADMIN_ROLE) {
    return 'Visao global'
  }

  if (currentPortal === BARBER_ROLE) {
    return 'Barbearia vinculada'
  }

  if (currentPortal === CUSTOMER_ROLE && currentSession?.user) {
    return 'Conta do cliente'
  }

  return 'Sem contexto'
}

function updateTopbarScreenContext(screenId = '') {
  const kicker = document.getElementById('topbar-screen-kicker')
  const title = document.getElementById('topbar-screen-title')
  const description = document.getElementById('topbar-screen-description')
  const portalBadge = document.getElementById('topbar-portal-badge')
  const contextBadge = document.getElementById('topbar-context-badge')
  const meta = SCREEN_CONTEXT_MAP[screenId] || SCREEN_CONTEXT_MAP[getDefaultScreenForPortal()] || SCREEN_CONTEXT_MAP.login

  if (kicker) {
    kicker.textContent = meta.kicker
  }

  if (title) {
    title.textContent = meta.title
  }

  if (description) {
    description.textContent = meta.description
  }

  if (portalBadge) {
    const portalLabel = isClientPublicView()
      ? 'Agendamento publico'
      : `Portal ${getCurrentPortalLabel().toLowerCase()}`
    portalBadge.textContent = portalLabel
  }

  if (contextBadge) {
    contextBadge.textContent = getCurrentTopbarContextLabel()
  }
}

function shouldUseMobileMenu() {
  return window.innerWidth <= 980
}

function isAppLoading() {
  return document.body?.classList.contains('app-loading')
}

function syncMobileMenuUi() {
  const toggle = document.getElementById('mobile-menu-toggle')
  const overlay = document.getElementById('mobile-menu-overlay')
  const isAvailable = shouldUseMobileMenu() && !isClientPublicView() && !isAppLoading()

  if (toggle) {
    toggle.style.display = isAvailable ? 'inline-flex' : 'none'
    toggle.setAttribute('aria-expanded', isAvailable && isMobileMenuOpen ? 'true' : 'false')
  }

  if (overlay) {
    overlay.style.display = isAvailable && isMobileMenuOpen ? 'block' : 'none'
  }

  if (!isAvailable) {
    isMobileMenuOpen = false
    document.body.classList.remove('mobile-menu-open')
    return
  }

  document.body.classList.toggle('mobile-menu-open', isMobileMenuOpen)
}

window.toggleMobileMenu = function () {
  if (!shouldUseMobileMenu() || isClientPublicView() || isAppLoading()) {
    return
  }

  isMobileMenuOpen = !isMobileMenuOpen
  syncMobileMenuUi()
}

window.closeMobileMenu = function () {
  if (!isMobileMenuOpen) {
    syncMobileMenuUi()
    return
  }

  isMobileMenuOpen = false
  syncMobileMenuUi()
}

async function fetchPlatformContext(forceRefresh = false) {
  if (!forceRefresh && platformContextCache) {
    return platformContextCache
  }

  if (currentSession?.user?.email && isAdminEmail(currentSession.user.email)) {
    let adminProfile = null
    try {
      const { data } = await getActiveSupabaseClient()
        .from('profiles')
        .select('name, status')
        .eq('id', currentSession.user.id)
        .maybeSingle()
      adminProfile = data || null
    } catch (_error) {
    }

    platformContextCache = buildMasterAdminContext(currentSession.user, adminProfile)
    return platformContextCache
  }

  try {
    const { data, error } = await invokeProtectedFunction('get-my-context', {}, {
      authErrorMessage: 'Sua sessao expirou. Faca login novamente para recuperar o contexto da plataforma.'
    })
    if (error || !data?.context) {
      return await buildPlatformContextFallback()
    }

    platformContextCache = data.context
    return platformContextCache
  } catch (_error) {
    return await buildPlatformContextFallback()
  }
}

function clearPlatformContextCache() {
  platformContextCache = null
}

async function buildPlatformContextFallback() {
  try {
    const client = getActiveSupabaseClient()
    let user = currentSession?.user || null
    let authError = null

    if (!user) {
      const authResult = await supabaseClient.auth.getUser()
      user = authResult.data?.user || null
      authError = authResult.error || null
    }

    if (authError || !user) {
      return null
    }

    if (isAdminEmail(user.email)) {
      const context = buildMasterAdminContext(user)
      platformContextCache = context
      return context
    }

    let profileQuery = await client
      .from('profiles')
      .select('id, email, name, global_role, status, role, barbershop_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileQuery.error && isMissingColumnError(profileQuery.error, ['global_role', 'status', 'name', 'role', 'barbershop_id'])) {
      profileQuery = await client
        .from('profiles')
        .select('id, email')
        .eq('id', user.id)
        .maybeSingle()
    }

    const profile = profileQuery.data

    if (profileQuery.error) {
      console.warn('Fallback de contexto falhou ao consultar profiles:', profileQuery.error.message)
    }

    let accessRows = []
    let accessError = null
    let userAccessQuery = await client
      .from('user_access')
      .select('barbershop_id, role, status, barbershops(name, status, plan_code)')
      .eq('user_id', user.id)

    if (userAccessQuery.error && isMissingColumnError(userAccessQuery.error, ['status', 'plan_code'])) {
      userAccessQuery = await client
        .from('user_access')
        .select('barbershop_id, role, status, barbershops(name, status)')
        .eq('user_id', user.id)
    }

    if (userAccessQuery.error && isMissingColumnError(userAccessQuery.error, ['status'])) {
      userAccessQuery = await client
        .from('user_access')
        .select('barbershop_id, role')
        .eq('user_id', user.id)
    }

    accessError = userAccessQuery.error

    if (!userAccessQuery.error) {
      accessRows = Array.isArray(userAccessQuery.data) ? userAccessQuery.data : []
    }

    if (accessError) {
      console.warn('Fallback de contexto falhou ao consultar user_access:', accessError.message)
    }

    const missingBarbershopNames = accessRows
      .map((item) => item.barbershop_id)
      .filter(Boolean)

    let barbershopMap = new Map()
    if (missingBarbershopNames.length) {
      let barbershopsQuery = await client
        .from('barbershops')
        .select('id, name, status, plan_code')
        .in('id', missingBarbershopNames)

      if (barbershopsQuery.error && isMissingColumnError(barbershopsQuery.error, ['status', 'plan_code'])) {
        barbershopsQuery = await client
          .from('barbershops')
          .select('id, name')
          .in('id', missingBarbershopNames)
      }

      if (barbershopsQuery.error) {
        console.warn('Fallback de contexto falhou ao consultar barbershops:', barbershopsQuery.error.message)
      } else {
        barbershopMap = new Map((barbershopsQuery.data || []).map((item) => [item.id, item]))
      }
    }

    const context = {
      user_id: user.id,
      email: profile?.email || user.email || '',
      name: profile?.name || '',
      global_role: profile?.global_role || (isAdminEmail(user.email) ? 'super_admin' : 'user'),
      profile_status: profile?.status || 'active',
      access: Array.isArray(accessRows)
        ? accessRows.map((item) => ({
            barbershop_id: item.barbershop_id,
            role: item.role,
            status: item.status || 'active',
            barbershop_name: item.barbershops?.name || barbershopMap.get(item.barbershop_id)?.name || '',
            barbershop_status: item.barbershops?.status || barbershopMap.get(item.barbershop_id)?.status || 'active',
            plan_code: item.barbershops?.plan_code || barbershopMap.get(item.barbershop_id)?.plan_code || 'free'
          }))
        : []
    }

    if (!context.access.length && profile?.barbershop_id) {
      context.access.push({
        barbershop_id: profile.barbershop_id,
        role: normalizeAccessRole(profile.role || CUSTOMER_ROLE),
        status: profile?.status === 'blocked' ? 'blocked' : 'active',
        barbershop_name: '',
        barbershop_status: 'active',
        plan_code: 'free'
      })
    }

    platformContextCache = context
    return platformContextCache
  } catch (fallbackError) {
    console.warn('Nao foi possivel montar o contexto por fallback:', fallbackError?.message || fallbackError)
    return null
  }
}

function getActiveAccessFromContext(context, preferredBarbershopId = '') {
  const activeAccess = Array.isArray(context?.access)
    ? context.access.filter((item) => item?.status === 'active')
    : []

  if (preferredBarbershopId) {
    return activeAccess.find((item) => item.barbershop_id === preferredBarbershopId) || null
  }

  return activeAccess[0] || null
}

function canAccessAdminPortal(user, context = null) {
  if (!user?.email) {
    return false
  }

  if (isAdminEmail(user.email)) {
    return true
  }

  return context?.global_role === 'super_admin'
}

function updateAdminContextUi(barbershops = null) {
  const wrapper = document.getElementById('admin-context-switcher')
  const select = document.getElementById('admin-active-barbershop')
  const details = document.getElementById('admin-context-details')
  const selectedContext = getAdminBarbershopContext()
  const shouldShow = currentPortal === 'admin' && Boolean(currentSession?.user)

  if (wrapper) {
    wrapper.style.display = shouldShow ? 'flex' : 'none'
  }

  if (!select) {
    return
  }

  if (Array.isArray(barbershops)) {
    const options = ['<option value="">Selecione a barbearia</option>']

    barbershops.forEach((item) => {
      const usersCount = adminContextStatsCache.usersByBarbershop.get(item.id) || 0
      const appointmentsCount = adminContextStatsCache.appointmentsByBarbershop.get(item.id) || 0
      const optionLabel = usersCount || appointmentsCount
        ? `${item.name} · ${usersCount} usuarios · ${appointmentsCount} agendamentos`
        : item.name
      options.push(`<option value="${item.id}">${optionLabel}</option>`)
    })

    select.innerHTML = options.join('')
  }

  select.value = selectedContext || ''

  if (details) {
    if (selectedContext) {
      const selectedBarbershop = Array.isArray(barbershops)
        ? barbershops.find((item) => item.id === selectedContext)
        : null
      const usersCount = adminContextStatsCache.usersByBarbershop.get(selectedContext) || 0
      const appointmentsCount = adminContextStatsCache.appointmentsByBarbershop.get(selectedContext) || 0
      details.textContent = `${selectedBarbershop?.name || 'Barbearia selecionada'} · ${usersCount} usuario(s) · ${appointmentsCount} agendamento(s).`
    } else {
      details.textContent = 'Sem contexto ativo. Escolha uma barbearia para abrir agenda, gestao, produtos e cadastros.'
    }
  }

  updateTopbarScreenContext(currentVisibleScreenId)
}

// Processo de login do usuario e carregamento inicial da tela.
window.login = async function () {
  const email = document.getElementById('email').value.trim().toLowerCase()
  const password = document.getElementById('password').value

  if (!email || !password) {
    setAuthFeedback('Informe email e senha para entrar.', 'error')
    return
  }

  setAuthFeedback('', 'info')
  setAuthLoading(true)

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('login auth error', error)
      setAuthFeedback(formatAuthErrorMessage(error, { email }), 'error')
      return
    }

    currentSession = data.session ?? currentSession
    lastAuthAccessToken = data.session?.access_token || lastAuthAccessToken
    clearPlatformContextCache()

    const signedUser = data.user || data.session?.user
    const resolvedPortal = isAdminEntryPage() ? 'admin' : await resolvePortalForUser(signedUser)

    if (!resolvedPortal) {
      setAuthFeedback('Nao foi possivel identificar o tipo de acesso desta conta.', 'error')
      return
    }

    setPortal(resolvedPortal)

    if (resolvedPortal === 'barbeiro') {
      const accessResult = await validateBarberPortalAccess(signedUser)

      if (!accessResult.allowed) {
        await supabaseClient.auth.signOut()
        currentSession = null
        clearPlatformContextCache()
        updateProtectedUi(false)
        applyPortalUi()
        showScreen('login')
        setAuthFeedback(accessResult.message, 'error')
        return
      }
    }

    if (resolvedPortal === 'admin') {
      const accessResult = await validateAdminPortalAccess(signedUser)

      if (!accessResult.allowed) {
        await supabaseClient.auth.signOut()
        currentSession = null
        clearPlatformContextCache()
        updateProtectedUi(false)
        applyPortalUi()
        showScreen('login')
        setAuthFeedback(accessResult.message, 'error')
        return
      }
    }

    if (resolvedPortal === 'admin' && !isAdminEntryPage()) {
      window.location.href = getAppUrl('admin.html')
      return
    }

    setAuthFeedback('Login realizado com sucesso.', 'success')
    updateProtectedUi(true)
    applyPortalUi()
    await handleUserAfterLogin(signedUser, resolvedPortal)
  } catch (err) {
    console.error('login error', err)
    setAuthFeedback('Erro no login. Tente novamente.', 'error')
  } finally {
    setAuthLoading(false)
  }
}

// Processo de criacao de conta do cliente em tela dedicada.
window.signup = async function () {
  console.log('signup called')

  const email = document.getElementById('email').value.trim().toLowerCase()
  const password = document.getElementById('password').value
  const signupName = document.getElementById('signup-name')?.value?.trim() || ''
  const signupPhone = document.getElementById('signup-phone')?.value?.trim() || ''

  setPortal('cliente')
  setAuthFeedback('', 'info')

  if (!email) {
    setAuthFeedback('Informe o email para criar sua conta.', 'error')
    return
  }

  if (!password) {
    setAuthFeedback('Informe uma senha para criar sua conta.', 'error')
    return
  }

  if (password.length < 6) {
    setAuthFeedback('A senha deve ter pelo menos 6 caracteres.', 'error')
    return
  }

  if (!signupName) {
    setAuthFeedback('Informe o nome completo.', 'error')
    return
  }

  if (!signupPhone) {
    setAuthFeedback('Informe o telefone.', 'error')
    return
  }

  setAuthLoading(true)

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAppUrl('cliente.html')
      }
    })

    if (error) {
      console.error('signup error response', error)
      setAuthFeedback(formatAuthErrorMessage(error, { email }) || 'Nao foi possivel criar a conta.', 'error')
      return
    }

    const user = data.user

    if (!user) {
      setAuthFeedback('Conta criada com sucesso. Verifique seu email para confirmar o cadastro e acessar o sistema.', 'success')
      return
    }

    const { error: profileError } = await upsertProfileRecord({
      id: user.id,
      email: user.email,
      role: CUSTOMER_ROLE,
      global_role: CUSTOMER_ROLE,
      name: signupName,
      phone: signupPhone,
      status: 'pending'
    })

    if (profileError) {
      console.error('signup profile error', profileError)
      setAuthFeedback(`Conta criada, mas nao foi possivel salvar o perfil: ${profileError.message}`, 'error')
      return
    }

    if (data.session) {
      await supabaseClient.auth.signOut()
      currentSession = null
      clearPlatformContextCache()
      updateProtectedUi(false)
    }

    const nameInput = document.getElementById('signup-name')
    const phoneInput = document.getElementById('signup-phone')

    if (nameInput) {
      nameInput.value = ''
    }

    if (phoneInput) {
      phoneInput.value = ''
    }

    const emailInput = document.getElementById('email')
    const passwordInput = document.getElementById('password')

    if (emailInput) {
      emailInput.value = ''
    }

    if (passwordInput) {
      passwordInput.value = ''
    }

    setAuthFeedback('Conta criada com sucesso. Verifique seu email e aguarde a aprovacao do super admin para acessar o sistema.', 'success')
  } catch (err) {
    console.error('signup error', err)
    setAuthFeedback('Erro no cadastro. Tente novamente.', 'error')
  } finally {
    setAuthLoading(false)
  }
}


// Cria registros basicos de barbeiro e servico para uma nova barbearia.
async function criarDadosIniciaisDaBarbearia(barbershopId) {
  const defaultBarbers = getDefaultBarbers(barbershopId)
  const defaultServices = getDefaultServices(barbershopId)

  const { data: existingBarbers, error: existingBarbersError } = await supabaseClient
    .from('barbers')
    .select('id')
    .eq('barbershop_id', barbershopId)
    .limit(1)

  if (existingBarbersError) {
    throw new Error(`Nao foi possivel verificar os barbeiros: ${existingBarbersError.message}`)
  }

  if (!existingBarbers || existingBarbers.length === 0) {
    const { error: barberError } = await supabaseClient
      .from('barbers')
      .insert(defaultBarbers)

    if (barberError) {
      throw new Error(`Nao foi possivel criar os barbeiros de teste: ${barberError.message}`)
    }
  }

  const { data: existingServices, error: existingServicesError } = await supabaseClient
    .from('services')
    .select('id')
    .eq('barbershop_id', barbershopId)
    .limit(1)

  if (existingServicesError) {
    throw new Error(`Nao foi possivel verificar os servicos: ${existingServicesError.message}`)
  }

  if (!existingServices || existingServices.length === 0) {
    const { error: serviceError } = await supabaseClient
      .from('services')
      .insert(defaultServices)

    if (serviceError) {
      throw new Error(`Nao foi possivel criar os servicos de teste: ${serviceError.message}`)
    }
  }
}

async function upsertCustomerRecord({ barbershopId, name, phone, email }) {
  if (!barbershopId || !name) {
    return { skipped: true }
  }

  const normalizedEmail = email ? email.trim().toLowerCase() : ''
  const normalizedPhone = phone ? phone.trim() : ''

  if (!normalizedEmail && !normalizedPhone) {
    return { skipped: true }
  }

  let existingQuery = supabaseClient
    .from('customers')
    .select('id')
    .eq('barbershop_id', barbershopId)

  if (normalizedEmail) {
    existingQuery = existingQuery.eq('email', normalizedEmail)
  } else {
    existingQuery = existingQuery.eq('phone', normalizedPhone)
  }

  const existingResult = await existingQuery.maybeSingle()

  if (existingResult.error) {
    if (isMissingTableError(existingResult.error, 'customers')) {
      return { skipped: true, missingTable: true }
    }

    return { skipped: true, error: existingResult.error }
  }

  const payload = {
    name,
    barbershop_id: barbershopId,
    ...(normalizedEmail ? { email: normalizedEmail } : {}),
    ...(normalizedPhone ? { phone: normalizedPhone } : {})
  }

  if (existingResult.data?.id) {
    const updateResult = await supabaseClient
      .from('customers')
      .update(payload)
      .eq('id', existingResult.data.id)

    return {
      skipped: false,
      error: updateResult.error || null
    }
  }

  const insertResult = await supabaseClient
    .from('customers')
    .insert([payload])

  return {
    skipped: false,
    error: insertResult.error || null
  }
}

async function createAppointmentServerSide(payload) {
  try {
    const { data, error } = await invokeProtectedFunction('create-appointment', payload, {
      authErrorMessage: 'Sua sessao expirou. Faca login novamente antes de concluir o agendamento.'
    })

    if (error) {
      return {
        success: false,
        fallbackToClient: true,
        message: error.message
      }
    }

    return {
      success: true,
      appointments: data?.appointments || []
    }
  } catch (error) {
    return {
      success: false,
      fallbackToClient: true,
      message: error.message
    }
  }
}

async function createAppointmentPaymentRecords(appointments, paymentData) {
  if (!Array.isArray(appointments) || appointments.length === 0 || !paymentData || paymentData.provider === 'none') {
    return { skipped: true }
  }

  const depositAmount = Number(paymentData.depositAmount || 0)
  if (!depositAmount) {
    return { skipped: true }
  }

  const rows = appointments.map((appointment) => ({
    appointment_id: appointment.id,
    barbershop_id: paymentData.barbershopId,
    customer_name: paymentData.customerName,
    customer_email: paymentData.customerEmail || null,
    customer_phone: paymentData.customerPhone || null,
    provider: paymentData.provider,
    payment_type: 'deposit',
    amount: depositAmount,
    currency: 'EUR',
    status: 'pending',
    checkout_reference: `${paymentData.provider}-${appointment.id}`
  }))

  const { error } = await supabaseClient
    .from('appointment_payments')
    .insert(rows)

  if (error && isMissingTableError(error, 'appointment_payments')) {
    return { skipped: true, missingTable: true }
  }

  return {
    skipped: false,
    error: error || null
  }
}
// Processo principal de criacao do agendamento.
window.agendar = async function () {
  const name = document.getElementById('name').value.trim()
  const phone = document.getElementById('customer-phone')?.value?.trim() || ''
  const formEmail = document.getElementById('customer-email')?.value?.trim().toLowerCase() || ''
  const time = document.getElementById('time').value
  const barberId = document.getElementById('barber').value
  const serviceIds = getSelectedServiceIds()

  if (!name) {
    alert('Informe o nome do cliente.')
    return
  }

  if (!phone) {
    alert('Informe o telefone do cliente.')
    return
  }

  if (!formEmail) {
    alert('Informe o email do cliente.')
    return
  }

  if (!time) {
    alert('Selecione uma data e horario para o agendamento.')
    return
  }

  if (!barberId || serviceIds.length === 0) {
    alert('Selecione barbeiro e pelo menos um servico antes de agendar.')
    return
  }

  const normalizedTime = normalizeAppointmentTime(time)
  if (!normalizedTime) {
    alert('Data invalida. Escolha outra data e tente novamente.')
    return
  }

  const barbershopId = currentBarbershopContext?.id || await getBarbershop()
  if (!barbershopId) {
    alert('Nao foi possivel identificar a barbearia do agendamento.')
    return
  }

  const { data: existing, error: existingError } = await supabaseClient
    .from('appointments')
    .select('*')
    .eq('barber_id', barberId)
    .eq('appointment_time', normalizedTime)

  if (existingError) {
    console.error('Erro ao validar horario', existingError)
    alert(existingError.message)
    return
  }

  if (existing && existing.length > 0) {
    const nextSlot = findNextAvailableSlotAfter(selectedAppointmentTime || normalizedTime.slice(0, 16))
    if (nextSlot) {
      selectedAppointmentTime = nextSlot.value
      document.getElementById('time').value = nextSlot.value
      renderAppointmentSlotPicker()
      alert(`Horario ocupado. Reagendamento automatico sugerido para ${nextSlot.label}.`)
      return
    }

    alert('Horario ja ocupado!')
    return
  }

  const currentUser = await getCurrentUser()
  const customerEmail = currentUser?.email || formEmail
  const planCheck = await canCreateAppointment(barbershopId, serviceIds.length)

  if (!planCheck.allowed) {
    alert(planCheck.message)
    return
  }

  const customerSyncResult = await upsertCustomerRecord({
    barbershopId,
    name,
    phone,
    email: customerEmail
  })

  if (customerSyncResult.error) {
    console.error('Erro ao sincronizar cliente no cadastro', customerSyncResult.error)
  }

  let appointmentTimeToUse = normalizedTime
  const serverSideResult = await createAppointmentServerSide({
    barberId,
    serviceIds,
    appointmentTime: appointmentTimeToUse,
    customerName: name,
    customerEmail,
    customerPhone: phone
  })

  if (serverSideResult.success) {
    const paymentProvider = document.getElementById('appointment-payment-provider')?.value || 'none'
    const paymentResult = await createAppointmentPaymentRecords(serverSideResult.appointments, {
      barbershopId,
      customerName: name,
      customerEmail,
      customerPhone: phone,
      provider: paymentProvider,
      depositAmount: getSelectedServicesTotalPrice() > 0 ? Math.max(5, Number((getSelectedServicesTotalPrice() * 0.2).toFixed(2))) : 0
    })

    if (paymentResult.error) {
      console.error('Erro ao registrar pagamento do agendamento', paymentResult.error)
    }

    showSuccess()
    resetAppointmentForm()
    await sincronizarAgendamentos()
    return
  }

  const appointmentsPayload = serviceIds.map((serviceId) => ({
    customer_name: name,
    barber_id: barberId,
    service_id: serviceId,
    appointment_time: appointmentTimeToUse,
    barbershop_id: barbershopId,
    customer_user_id: currentUser?.id,
    customer_email: customerEmail || null,
    status: 'scheduled',
    finalized_at: null
  }))

  let insertResult = await supabaseClient
    .from('appointments')
    .insert(appointmentsPayload)
    .select('id, service_id, barber_id, customer_name, appointment_time')

  if (
    insertResult.error &&
    isMissingAppointmentIdentityColumnsError(insertResult.error) &&
    isMissingAppointmentWorkflowColumnsError(insertResult.error)
  ) {
    appointmentIdentitySupport = false
    appointmentWorkflowSupport = false

    const fallbackAppointmentsPayload = serviceIds.map((serviceId) => ({
      customer_name: name,
      barber_id: barberId,
      service_id: serviceId,
      appointment_time: appointmentTimeToUse,
      barbershop_id: barbershopId
    }))

    insertResult = await supabaseClient
      .from('appointments')
      .insert(fallbackAppointmentsPayload)
      .select('id, service_id, barber_id, customer_name, appointment_time')
  } else if (insertResult.error && isMissingAppointmentIdentityColumnsError(insertResult.error)) {
    appointmentIdentitySupport = false

    const fallbackAppointmentsPayload = serviceIds.map((serviceId) => ({
      customer_name: name,
      barber_id: barberId,
      service_id: serviceId,
      appointment_time: appointmentTimeToUse,
      barbershop_id: barbershopId,
      status: 'scheduled',
      finalized_at: null
    }))

    insertResult = await supabaseClient
      .from('appointments')
      .insert(fallbackAppointmentsPayload)
      .select('id, service_id, barber_id, customer_name, appointment_time')
  } else if (insertResult.error && isMissingAppointmentWorkflowColumnsError(insertResult.error)) {
    appointmentWorkflowSupport = false

    const fallbackAppointmentsPayload = serviceIds.map((serviceId) => ({
      customer_name: name,
      barber_id: barberId,
      service_id: serviceId,
      appointment_time: appointmentTimeToUse,
      barbershop_id: barbershopId,
      customer_user_id: currentUser?.id,
      customer_email: customerEmail || null
    }))

    insertResult = await supabaseClient
      .from('appointments')
      .insert(fallbackAppointmentsPayload)
      .select('id, service_id, barber_id, customer_name, appointment_time')
  } else if (!insertResult.error) {
    appointmentIdentitySupport = true
    appointmentWorkflowSupport = true
  }

  const { error } = insertResult

  if (error) {
    const conflictMessage = String(error.message || '').toLowerCase()
    if (conflictMessage.includes('duplicate') || conflictMessage.includes('confl') || conflictMessage.includes('occupied')) {
      const nextSlot = findNextAvailableSlotAfter(selectedAppointmentTime || appointmentTimeToUse.slice(0, 16))
      if (nextSlot) {
        appointmentTimeToUse = nextSlot.value
        selectedAppointmentTime = nextSlot.value
        document.getElementById('time').value = nextSlot.value
        renderAppointmentSlotPicker()
        alert(`Horario ocupado. Reagendamento automatico sugerido para ${nextSlot.label}. Clique em Agendar novamente para confirmar.`)
        return
      }
    }

    console.error('Erro ao agendar', error)
    alert(error.message)
    return
  }

  {
    const paymentProvider = document.getElementById('appointment-payment-provider')?.value || 'none'
    const paymentResult = await createAppointmentPaymentRecords(insertResult.data || [], {
      barbershopId,
      customerName: name,
      customerEmail,
      customerPhone: phone,
      provider: paymentProvider,
      depositAmount: getSelectedServicesTotalPrice() > 0 ? Math.max(5, Number((getSelectedServicesTotalPrice() * 0.2).toFixed(2))) : 0
    })

    if (paymentResult.error) {
      console.error('Erro ao registrar pagamento do agendamento', paymentResult.error)
    }
  }

  showSuccess()
  resetAppointmentForm()
  await sincronizarAgendamentos()
}

// Exibe um aviso visual curto apos agendar com sucesso.
function showSuccess() {
  const msg = document.createElement('div')
  msg.innerText = 'Agendado com sucesso!'
  msg.className = 'toast-success'

  document.body.appendChild(msg)
  setTimeout(() => msg.remove(), 3000)
}

// Normaliza a data local para o formato ISO esperado no banco.
function normalizeAppointmentTime(time) {
  const parsedDate = new Date(time)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return parsedDate.toISOString()
}

function formatDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildUpcomingDays(totalDays = 7) {
  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() + index)
    return date
  })
}

function formatHourLabel(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function estimateSelectedDurationMinutes() {
  const selectedCount = getSelectedServiceIds().length
  return Math.max(selectedCount, 1) * 30
}

function getSuggestedSlotValues(limit = 3) {
  return appointmentSlotsCache
    .filter((slot) => !slot.disabled)
    .slice(0, limit)
    .map((slot) => slot.value)
}

function findNextAvailableSlotAfter(slotValue) {
  const targetIndex = appointmentSlotsCache.findIndex((slot) => slot.value === slotValue)
  const fallbackIndex = targetIndex >= 0 ? targetIndex + 1 : 0

  return appointmentSlotsCache
    .slice(fallbackIndex)
    .find((slot) => !slot.disabled) || appointmentSlotsCache.find((slot) => !slot.disabled) || null
}

async function fetchAppointmentsForBarber(barberId, dayKey) {
  if (!barberId || !dayKey) {
    return []
  }

  const start = new Date(`${dayKey}T00:00:00`)
  const end = new Date(`${dayKey}T23:59:59`)

  const { data, error } = await supabaseClient
    .from('appointments')
    .select('id, appointment_time, service_id')
    .eq('barber_id', barberId)
    .gte('appointment_time', start.toISOString())
    .lte('appointment_time', end.toISOString())

  if (error) {
    console.error('Erro ao buscar horarios ocupados', error)
    return []
  }

  return data || []
}

async function refreshAppointmentSlotPicker() {
  const dayPicker = document.getElementById('appointment-day-picker')
  const slotPicker = document.getElementById('appointment-slot-picker')
  const barberId = document.getElementById('barber')?.value || ''

  if (!dayPicker || !slotPicker) {
    return
  }

  if (!selectedAppointmentDay) {
    selectedAppointmentDay = formatDateKey(buildUpcomingDays(1)[0])
  }

  renderAppointmentDayPicker()

  if (!barberId || getSelectedServiceIds().length === 0) {
    slotPicker.innerHTML = '<div class="admin-empty">Selecione barbeiro e servicos para ver horarios.</div>'
    document.getElementById('time').value = ''
    return
  }

  slotPicker.innerHTML = '<div class="admin-empty">Carregando horarios disponiveis...</div>'

  const existingAppointments = await fetchAppointmentsForBarber(barberId, selectedAppointmentDay)
  const durationMinutes = estimateSelectedDurationMinutes()
  const occupiedTimes = new Set(existingAppointments.map((item) => {
    const date = new Date(item.appointment_time)
    return `${date.getHours()}:${date.getMinutes()}`
  }))

  const slots = []
  for (let hour = 9; hour < 19; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      const slotDate = new Date(`${selectedAppointmentDay}T00:00:00`)
      slotDate.setHours(hour, minute, 0, 0)

      if (slotDate < new Date()) {
        continue
      }

      const occupationKey = `${slotDate.getHours()}:${slotDate.getMinutes()}`
      const isOccupied = occupiedTimes.has(occupationKey)
      slots.push({
        value: slotDate.toISOString().slice(0, 16),
        label: `${formatHourLabel(slotDate)} · ${durationMinutes} min`,
        disabled: isOccupied
      })
    }
  }

  const suggestedSlots = slots
    .filter((slot) => !slot.disabled)
    .slice(0, 3)
    .map((slot) => slot.value)
  appointmentSlotsCache = slots.map((slot) => ({
    ...slot,
    suggested: suggestedSlots.includes(slot.value)
  }))
  renderAppointmentSlotPicker()
}

function renderAppointmentDayPicker() {
  const container = document.getElementById('appointment-day-picker')
  if (!container) {
    return
  }

  container.innerHTML = buildUpcomingDays(7)
    .map((date) => {
      const value = formatDateKey(date)
      const isActive = selectedAppointmentDay === value
      return `
        <button
          type="button"
          class="slot-day ${isActive ? 'is-active' : ''}"
          onclick="selecionarDiaAgendamento('${value}')"
        >
          <strong>${date.toLocaleDateString('pt-BR', { weekday: 'short' })}</strong>
          <span>${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
        </button>
      `
    })
    .join('')
}

function renderAppointmentSlotPicker() {
  const container = document.getElementById('appointment-slot-picker')
  if (!container) {
    return
  }

  if (!appointmentSlotsCache.length) {
    container.innerHTML = '<div class="admin-empty">Nenhum horario disponivel para o dia selecionado.</div>'
    return
  }

  container.innerHTML = appointmentSlotsCache
    .map((slot) => `
      <button
        type="button"
        class="slot-chip ${selectedAppointmentTime === slot.value ? 'is-active' : ''} ${slot.suggested ? 'is-suggested' : ''}"
        ${slot.disabled ? 'disabled' : ''}
        onclick="${slot.disabled ? '' : `selecionarHorarioAgendamento('${slot.value}')`}"
      >
        ${slot.disabled ? `${slot.label} · Ocupado` : `${slot.label}${slot.suggested ? ' · Sugerido' : ''}`}
      </button>
    `)
    .join('')
}

window.selecionarDiaAgendamento = async function (dayKey) {
  selectedAppointmentDay = dayKey
  selectedAppointmentTime = ''
  await refreshAppointmentSlotPicker()
}

window.selecionarHorarioAgendamento = function (slotValue) {
  selectedAppointmentTime = slotValue
  const timeInput = document.getElementById('time')
  if (timeInput) {
    timeInput.value = slotValue
  }
  renderAppointmentSlotPicker()
}

function renderAgendaDayPicker() {
  const container = document.getElementById('agenda-day-picker')
  if (!container) {
    return
  }

  if (!selectedAgendaDay) {
    selectedAgendaDay = formatDateKey(buildUpcomingDays(1)[0])
  }

  container.innerHTML = buildUpcomingDays(7)
    .map((date) => {
      const value = formatDateKey(date)
      return `
        <button
          type="button"
          class="slot-day ${selectedAgendaDay === value ? 'is-active' : ''}"
          onclick="selecionarDiaAgenda('${value}')"
        >
          <strong>${date.toLocaleDateString('pt-BR', { weekday: 'short' })}</strong>
          <span>${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
        </button>
      `
    })
    .join('')
}

window.alterarModoAgenda = function (mode) {
  agendaViewMode = mode
  document.getElementById('agenda-view-day')?.classList.toggle('is-active', mode === 'day')
  document.getElementById('agenda-view-week')?.classList.toggle('is-active', mode === 'week')
  carregarAgenda()
}

window.selecionarDiaAgenda = function (dayKey) {
  selectedAgendaDay = dayKey
  renderAgendaDayPicker()
  carregarAgenda()
}

// Limpa o formulario apos o agendamento.
function resetAppointmentForm() {
  document.getElementById('name').value = ''
  const customerPhoneInput = document.getElementById('customer-phone')
  const customerEmailInput = document.getElementById('customer-email')
  document.getElementById('time').value = ''
  document.getElementById('barber').value = ''
  if (customerPhoneInput) {
    customerPhoneInput.value = ''
  }
  if (customerEmailInput) {
    customerEmailInput.value = ''
  }
  const paymentProviderInput = document.getElementById('appointment-payment-provider')
  if (paymentProviderInput) {
    paymentProviderInput.value = 'none'
  }
  clearSelectedServices()
  selectedAppointmentTime = ''
  selectedAppointmentDay = formatDateKey(buildUpcomingDays(1)[0])
  updateServiceTriggerLabel()
  updateAppointmentPaymentSummary()
  updateMinDateTime()
  refreshAppointmentSlotPicker()
}

// Carrega barbeiros e servicos disponiveis para os selects da tela.
async function carregarDados() {
  const contextualBarbershopId = getCurrentBarbershopContextId()
  const barbershopId = contextualBarbershopId || (currentPortal === 'barbeiro' || currentPortal === 'admin' ? await getBarbershop() : null)
  const shouldFilterByBarbershop = Boolean(barbershopId)

  if ((currentPortal === 'barbeiro' || currentPortal === 'admin') && !barbershopId) {
    renderSelectState('barber', getTenantPortalMessage('Nenhum barbeiro disponivel'), true)
    renderServiceState(getTenantPortalMessage('Nenhum servico disponivel'))
    return
  }

  renderSelectState('barber', 'Carregando barbeiros...', true)
  renderServiceState('Carregando servicos...')

  let barbersQuery = supabaseClient
    .from('barbers')
    .select('id, name, barbershop_id')
    .order('name', { ascending: true })

  let servicesQuery = supabaseClient
    .from('services')
    .select('id, name, price, barbershop_id')
    .order('name', { ascending: true })

  if (shouldFilterByBarbershop) {
    barbersQuery = barbersQuery.eq('barbershop_id', barbershopId)
    servicesQuery = servicesQuery.eq('barbershop_id', barbershopId)
  }

  const { data: barbers, error: barbersError } = await barbersQuery
  const { data: services, error: servicesError } = await servicesQuery

  if (!contextualBarbershopId && barbershopId && !barbersError && !servicesError && (barbers?.length === 0 || services?.length === 0)) {
    try {
      await criarDadosIniciaisDaBarbearia(barbershopId)
      return carregarDados()
    } catch (seedError) {
      console.error('Erro ao criar dados iniciais', seedError)
      alert(seedError.message)
    }
  }

  if (barbersError) {
    console.error('Erro ao carregar barbeiros', barbersError)
    renderSelectState('barber', 'Erro ao carregar barbeiros', true)
  } else {
    populateSelect('barber', barbers, 'Selecione um barbeiro')
  }

  if (servicesError) {
    console.error('Erro ao carregar servicos', servicesError)
    renderServiceState('Erro ao carregar servicos')
  } else {
    renderServiceOptions(services)
  }

  updateAppointmentPaymentSummary()
  updateMinDateTime()
  if (!selectedAppointmentDay) {
    selectedAppointmentDay = formatDateKey(buildUpcomingDays(1)[0])
  }
  await refreshAppointmentSlotPicker()
  if (barbershopId && !isClientPublicView()) {
    await carregarOnboarding(barbershopId)
  }
}

// Monta a listagem de agendamentos salvos.
window.carregarAgenda = async function () {
  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    renderHistoryMessage('lista', 'Faca login para visualizar a agenda da barbearia.')
    return
  }

  let query = await supabaseClient
    .from('appointments')
    .select(`
      id,
      customer_name,
      appointment_time,
      status,
      finalized_at,
      barbers (
        name
      ),
      services (
        name,
        description,
        price
      )
    `)
    .eq('barbershop_id', barbershopId)
    .order('appointment_time', { ascending: true })

  if (query.error && isMissingAppointmentWorkflowColumnsError(query.error)) {
    appointmentWorkflowSupport = false
    query = await supabaseClient
      .from('appointments')
      .select(`
        id,
        customer_name,
        appointment_time,
        barbers (
          name
        ),
        services (
          name,
          description,
          price
        )
      `)
      .eq('barbershop_id', barbershopId)
      .order('appointment_time', { ascending: true })
  } else if (!query.error) {
    appointmentWorkflowSupport = true
  }

  const { data, error } = query

  if (error) {
    console.error('Erro ao carregar agenda', error)
    alert('Erro ao carregar agenda: ' + error.message)
    return
  }

  renderAgendaDayPicker()
  renderAgendaVisual(data || [])
}

// Mantem as listas de agendamento atualizadas entre o portal do cliente e o do barbeiro.
async function sincronizarAgendamentos() {
  const tasks = []

  if (document.getElementById('lista')) {
    tasks.push(carregarAgenda())
  }

  if (document.getElementById('client-history-list')) {
    tasks.push(carregarHistoricoCliente())
  }

  await Promise.all(tasks)
}

// Carrega o historico de agendamentos vinculado ao cliente logado.
window.carregarHistoricoCliente = async function () {
  const historyContainerId = 'client-history-list'
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    renderHistoryMessage(historyContainerId, 'Faca login para consultar seu historico de agendamentos.')
    return
  }

  let query = await supabaseClient
    .from('appointments')
    .select(`
      id,
      customer_name,
      appointment_time,
      status,
      finalized_at,
      customer_email,
      customer_user_id,
      barbers (
        name
      ),
      services (
        name,
        description,
        price
      )
    `)
    .or([
      `customer_user_id.eq.${currentUser.id}`,
      currentUser.email ? `customer_email.eq.${escapeSupabaseFilterValue(currentUser.email)}` : null
    ].filter(Boolean).join(','))
    .order('appointment_time', { ascending: false })

  if (query.error && isMissingAppointmentIdentityColumnsError(query.error)) {
    appointmentIdentitySupport = false
    renderHistoryMessage(
      historyContainerId,
      'Adicione customer_user_id e customer_email na tabela appointments para liberar o historico do cliente logado.'
    )
    return
  }

  if (query.error && isMissingAppointmentWorkflowColumnsError(query.error)) {
    appointmentWorkflowSupport = false
    query = await supabaseClient
      .from('appointments')
      .select(`
        id,
        customer_name,
        appointment_time,
        customer_email,
        customer_user_id,
        barbers (
          name
        ),
        services (
          name,
          description,
          price
        )
      `)
      .or([
        `customer_user_id.eq.${currentUser.id}`,
        currentUser.email ? `customer_email.eq.${escapeSupabaseFilterValue(currentUser.email)}` : null
      ].filter(Boolean).join(','))
      .order('appointment_time', { ascending: false })
  }

  if (query.error) {
    renderHistoryMessage(historyContainerId, `Erro ao carregar historico: ${query.error.message}`)
    return
  }

  appointmentIdentitySupport = true
  appointmentWorkflowSupport = true
  renderAppointmentCards(historyContainerId, deduplicateAppointments(query.data || []), 'Nenhum agendamento encontrado para sua conta.')
}

// Carrega os dados administrativos da tela de cadastros.
window.carregarCadastros = async function () {
  await populateBarberBarbershopSelect()

  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    renderAdminMessage('customers-admin-list', getTenantPortalMessage('Faca login para gerenciar clientes.'))
    renderAdminMessage('barbers-admin-list', getTenantPortalMessage('Faca login para gerenciar barbeiros.'))
    renderAdminMessage('services-admin-list', getTenantPortalMessage('Faca login para gerenciar servicos.'))
    renderAdminMessage('products-admin-list', getTenantPortalMessage('Faca login para gerenciar produtos.'))
    return
  }

  await Promise.all([
    carregarClientesAdmin(barbershopId),
    carregarBarbeirosAdmin(barbershopId),
    carregarServicosAdmin(barbershopId),
    carregarProdutosAdmin(barbershopId)
  ])
}

async function populateBarberBarbershopSelect() {
  const select = document.getElementById('new-barber-barbershop')
  if (!select) {
    return
  }

  const currentContextBarbershopId = currentPortal === 'admin' ? getAdminBarbershopContext() : await getBarbershop()

  let query = supabaseClient
    .from('barbershops')
    .select('id, name')
    .order('name', { ascending: true })

  if (currentPortal !== 'admin' && currentContextBarbershopId) {
    query = query.eq('id', currentContextBarbershopId)
  }

  const { data, error } = await query

  if (error) {
    select.innerHTML = '<option value="">Erro ao carregar barbearias</option>'
    select.disabled = true
    return
  }

  const items = Array.isArray(data) ? data : []
  select.innerHTML = [
    '<option value="">Selecione a barbearia</option>',
    ...items.map((item) => `<option value="${item.id}">${item.name}</option>`)
  ].join('')

  if (currentContextBarbershopId && items.some((item) => item.id === currentContextBarbershopId)) {
    select.value = currentContextBarbershopId
  }

  select.disabled = items.length === 0
}

// Carrega a vitrine de produtos exibida no portal do cliente.
window.carregarProdutos = async function () {
  let barbershopId = null

  if (currentPortal === 'barbeiro' || currentPortal === 'admin') {
    barbershopId = await getBarbershop()
  }

  if ((currentPortal === 'barbeiro' || currentPortal === 'admin') && !barbershopId) {
    renderCatalogMessage(getTenantPortalMessage('Faca login para visualizar os produtos da barbearia.'))
    return
  }

  const productsResult = await fetchManagementProducts(barbershopId)
  managementProductsCache = productsResult.items

  if (productsResult.errorMessage && productsResult.items.length === 0) {
    renderCatalogMessage(productsResult.errorMessage)
    return
  }

  renderProductsCatalog(productsResult.items || [], productsResult.stockSupported)
}

// Carrega a pagina de gestao com indicadores financeiros e operacionais.
window.carregarGestao = async function () {
  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    renderManagementMessage('management-summary', getTenantPortalMessage('Faca login para visualizar a gestao.'))
    renderManagementMessage('stock-list', getTenantPortalMessage('Faca login para visualizar o estoque.'))
    renderManagementMessage('sales-list', getTenantPortalMessage('Faca login para visualizar as vendas.'))
    renderManagementMessage('services-revenue-list', getTenantPortalMessage('Faca login para visualizar os servicos.'))
    renderManagementMessage('top-services-list', getTenantPortalMessage('Faca login para visualizar o ranking de servicos.'))
    renderManagementMessage('barber-revenue-list', getTenantPortalMessage('Faca login para visualizar o faturamento por barbeiro.'))
    renderManagementMessage('plan-usage-list', getTenantPortalMessage('Faca login para visualizar o plano da barbearia.'))
    renderManagementMessage('return-alerts-list', getTenantPortalMessage('Faca login para visualizar os alertas de retorno.'))
    renderAccessManagementMessage(getTenantPortalMessage('Faca login como admin para gerenciar os acessos do portal barbeiro.'))
    populateSaleProducts([])
    return
  }

  const productsResult = await fetchManagementProducts(barbershopId)
  managementProductsCache = productsResult.items
  populateSaleProducts(productsResult.items)
  renderStockList(productsResult.items, productsResult.stockSupported, productsResult.errorMessage)

  const [appointmentsResult, serviceSalesResult, productSalesResult, upcomingAppointmentsResult] = await Promise.all([
    fetchAppointmentsWithRelations(barbershopId),
    fetchServiceSales(barbershopId),
    fetchProductSales(barbershopId),
    fetchUpcomingAppointments(barbershopId)
  ])

  renderManagementSummary(serviceSalesResult, appointmentsResult, productSalesResult)
  renderServiceRevenue(serviceSalesResult, appointmentsResult)
  renderTopServices(serviceSalesResult, appointmentsResult)
  renderBarberRevenue(serviceSalesResult, appointmentsResult)
  renderProductSales(productSalesResult)
  renderNotificationsCenter(upcomingAppointmentsResult.items || [])
  await carregarClientesAdmin(barbershopId, { targetContainerId: 'crm-customers-preview', previewMode: true })
  await renderPlanUsage(barbershopId)
  renderReturnAlerts(customersCrmCache)
  await carregarOnboarding(barbershopId)
}

async function carregarOnboarding(barbershopId) {
  const panel = document.getElementById('onboarding-panel')
  const compactCard = document.getElementById('appointment-onboarding')
  const managementContainer = document.getElementById('management-onboarding')

  if (!panel || !compactCard || !managementContainer) {
    return
  }

  if (!(currentPortal === 'barbeiro' || currentPortal === 'admin') || !barbershopId) {
    panel.style.display = 'none'
    compactCard.style.display = 'none'
    return
  }

  const [barbersResult, servicesResult, appointmentsResult] = await Promise.all([
    supabaseClient.from('barbers').select('id').eq('barbershop_id', barbershopId),
    supabaseClient.from('services').select('id').eq('barbershop_id', barbershopId),
    supabaseClient.from('appointments').select('id').eq('barbershop_id', barbershopId).limit(1)
  ])

  const steps = [
    { label: 'Criar barbearia', done: true, action: currentPortal === 'admin' ? "mostrarTela('admin-barbershops')" : "mostrarTela('gestao')" },
    { label: 'Criar barbeiro', done: (barbersResult.data || []).length > 0, action: "mostrarTela('cadastros')" },
    { label: 'Criar servico', done: (servicesResult.data || []).length > 0, action: "mostrarTela('cadastros')" },
    { label: 'Fazer primeiro agendamento', done: (appointmentsResult.data || []).length > 0, action: "mostrarTela('agendar')" }
  ]

  const completedSteps = steps.filter((step) => step.done).length
  const currentStepNumber = Math.min(completedSteps + 1, steps.length)
  const progressPercent = Math.round((completedSteps / steps.length) * 100)
  const nextPendingStep = steps.find((step) => !step.done) || steps[steps.length - 1]

  document.getElementById('onboarding-step-title').textContent = `Passo ${currentStepNumber} de ${steps.length}`
  document.getElementById('onboarding-step-badge').textContent = `${progressPercent}%`
  document.getElementById('onboarding-progress-fill').style.width = `${progressPercent}%`
  document.getElementById('onboarding-step-description').textContent = nextPendingStep.done
    ? 'Parabens. Sua operacao inicial esta completa.'
    : `Proximo passo: ${nextPendingStep.label}.`

  const stepsMarkup = steps
    .map((step, index) => `
      <div class="management-row">
        <div>
          <strong>${step.done ? 'Concluido' : `Passo ${index + 1}`}</strong>
          <span class="management-meta">${step.label}</span>
        </div>
        <button type="button" class="${step.done ? 'secondary-action' : ''}" onclick="${step.action}">
          ${step.done ? 'Revisar' : 'Abrir'}
        </button>
      </div>
    `)
    .join('')

  managementContainer.innerHTML = stepsMarkup
  document.getElementById('onboarding-step-list').innerHTML = stepsMarkup
  panel.style.display = 'block'
  compactCard.style.display = completedSteps < steps.length ? 'block' : 'none'
}

// Remove um agendamento da agenda.
window.deletarAgendamento = async function (id) {
  if (!confirm('Tem certeza que deseja apagar este agendamento?')) {
    return
  }

  const { error: serviceSalesError } = await supabaseClient
    .from('service_sales')
    .delete()
    .eq('appointment_id', id)

  if (serviceSalesError) {
    console.error('Erro ao apagar service_sales do agendamento', serviceSalesError)
    alert('Erro ao apagar servicos realizados: ' + serviceSalesError.message)
    return
  }

  const { error } = await supabaseClient
    .from('appointments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Erro ao apagar agendamento', error)
    alert('Erro ao apagar agendamento: ' + error.message)
    return
  }

  alert('Agendamento apagado com sucesso.')
  await sincronizarAgendamentos()
  await carregarGestao()
}

// Finaliza um agendamento do barbeiro e libera a visualizacao no historico do cliente.
window.finalizarAgendamento = async function (id) {
  if (!confirm('Marcar este agendamento como finalizado?')) {
    return
  }

  const { data: appointment, error: appointmentError } = await supabaseClient
    .from('appointments')
    .select('id, customer_name, barber_id, service_id, appointment_time, barbershop_id, status')
    .eq('id', id)
    .single()

  if (appointmentError) {
    alert(`Erro ao consultar agendamento: ${appointmentError.message}`)
    return
  }

  if (appointment?.status === 'finalized') {
    alert('Este agendamento ja esta finalizado.')
    return
  }

  const finalizedAt = new Date().toISOString()
  const updatePayload = {
    status: 'finalized',
    finalized_at: finalizedAt
  }

  const { error: finalizeError } = await supabaseClient
    .from('appointments')
    .update(updatePayload)
    .eq('id', id)

  if (finalizeError && isMissingAppointmentWorkflowColumnsError(finalizeError)) {
    appointmentWorkflowSupport = false
    alert('Adicione as colunas status e finalized_at na tabela appointments para habilitar a finalizacao.')
    return
  }

  if (finalizeError) {
    alert(`Erro ao finalizar agendamento: ${finalizeError.message}`)
    return
  }

  appointmentWorkflowSupport = true

  const { data: existingSale, error: existingSaleError } = await supabaseClient
    .from('service_sales')
    .select('id')
    .eq('appointment_id', id)
    .maybeSingle()

  if (existingSaleError) {
    console.error('Erro ao validar service_sales do agendamento', existingSaleError)
  }

  if (!existingSale) {
    const { data: service, error: serviceError } = await supabaseClient
      .from('services')
      .select('price')
      .eq('id', appointment.service_id)
      .maybeSingle()

    if (serviceError) {
      alert(`Agendamento finalizado, mas nao foi possivel consultar o servico: ${serviceError.message}`)
    } else {
      const { error: serviceSalesError } = await supabaseClient
        .from('service_sales')
        .insert([
          {
            appointment_id: appointment.id,
            barber_id: appointment.barber_id,
            service_id: appointment.service_id,
            barbershop_id: appointment.barbershop_id,
            customer_name: appointment.customer_name,
            service_price: Number(service?.price || 0),
            performed_at: appointment.appointment_time
          }
        ])

      if (serviceSalesError) {
        console.error('Erro ao registrar service_sales na finalizacao', serviceSalesError)
        alert(`Agendamento finalizado, mas nao foi possivel registrar o servico realizado: ${serviceSalesError.message}`)
      }
    }
  }

  await sincronizarAgendamentos()
  await carregarGestao()
}

// Alterna entre as telas do app conforme o menu lateral.
window.mostrarTela = async function (tela) {
  const isLoggedIn = await hasActiveSession()

  if (!isLoggedIn && tela !== 'login') {
    alert('Faca login para acessar essa area.')
    showScreen('login')
    return
  }

  if (!isScreenAllowedForPortal(tela)) {
    alert('Essa area nao esta disponivel no portal selecionado.')
    showScreen(getDefaultScreenForPortal())
    await carregarPortalData(getDefaultScreenForPortal())
    return
  }

  showScreen(tela)
  await carregarPortalData(tela)
}

// Encerra a sessao do usuario e volta para a tela inicial.
window.logout = async function () {
  try {
    const { error } = await supabaseClient.auth.signOut()
    if (error) {
      alert('Erro ao sair: ' + error.message)
      return
    }

    alert('Voce saiu com sucesso.')
    currentSession = null
    clearPlatformContextCache()
    currentBarbershopId = null
    if (isAdminEntryPage()) {
      setPortal('admin')
    } else if (currentBarbershopContext) {
      currentPortal = 'cliente'
    } else {
      currentPortal = null
      localStorage.removeItem(PORTAL_STORAGE_KEY)
    }
    updateProtectedUi(false)
    applyPortalUi()
    if (currentBarbershopContext) {
      showScreen('agendar')
      await carregarPortalData('agendar')
      return
    }

    showScreen('login')
  } catch (err) {
    console.error('logout error', err)
    alert('Erro ao sair (ver console)')
  }
}

// Descobre a barbearia vinculada ao usuario autenticado.
async function getBarbershop() {
  if (getCurrentBarbershopContextId()) {
    currentBarbershopId = getCurrentBarbershopContextId()
    return currentBarbershopId
  }

  if (currentBarbershopId) {
    return currentBarbershopId
  }

  const {
    data: { user },
    error: authError
  } = await supabaseClient.auth.getUser()

  if (authError) {
    console.error('getUser error', authError)
    return null
  }

  if (!user) return null

  const context = await fetchPlatformContext()
  if (context) {
    if (context.global_role === 'super_admin') {
      currentBarbershopId = getAdminBarbershopContext()

      if (!currentBarbershopId) {
        const { data: barbershops } = await supabaseClient
          .from('barbershops')
          .select('id, name')
          .order('name', { ascending: true })

        if (Array.isArray(barbershops) && barbershops.length === 1) {
          setAdminBarbershopContext(barbershops[0].id)
          currentBarbershopId = barbershops[0].id
        }
      }

      return currentBarbershopId
    }

    const activeAccess = getActiveAccessFromContext(context)
    if (activeAccess?.barbershop_id) {
      currentBarbershopId = activeAccess.barbershop_id
      return currentBarbershopId
    }
  }

  if (isAdminEmail(user.email)) {
    currentBarbershopId = getAdminBarbershopContext()

    if (!currentBarbershopId) {
      const { data: barbershops } = await supabaseClient
        .from('barbershops')
        .select('id, name')
        .order('name', { ascending: true })

      if (Array.isArray(barbershops) && barbershops.length === 1) {
        setAdminBarbershopContext(barbershops[0].id)
        currentBarbershopId = barbershops[0].id
      }
    }

    return currentBarbershopId
  }

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('barbershop_id')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('getBarbershop error', error)
    return null
  }

  currentBarbershopId = data?.barbershop_id ?? null

  return currentBarbershopId
}

// Resolve a barbearia do agendamento a partir do barbeiro e dos servicos escolhidos.
async function resolveAppointmentBarbershop(barberId, serviceIds) {
  if (getCurrentBarbershopContextId()) {
    return getCurrentBarbershopContextId()
  }

  const sessionBarbershopId = await getBarbershop()
  if (sessionBarbershopId) {
    return sessionBarbershopId
  }

  const [{ data: barber, error: barberError }, { data: services, error: servicesError }] = await Promise.all([
    supabaseClient
      .from('barbers')
      .select('barbershop_id')
      .eq('id', barberId)
      .maybeSingle(),
    supabaseClient
      .from('services')
      .select('id, barbershop_id')
      .in('id', serviceIds)
  ])

  if (barberError || servicesError) {
    console.error('Erro ao resolver a barbearia do agendamento', barberError || servicesError)
    return null
  }

  const serviceBarbershopIds = new Set((services || []).map((item) => item.barbershop_id).filter(Boolean))

  if (!barber?.barbershop_id) {
    return null
  }

  if (serviceBarbershopIds.size === 0) {
    return barber.barbershop_id
  }

  if (serviceBarbershopIds.size > 1 || !serviceBarbershopIds.has(barber.barbershop_id)) {
    alert('Selecione barbeiro e servicos da mesma barbearia.')
    return null
  }

  return barber.barbershop_id
}

// Retorna o usuario autenticado atual para vincular dados ao cliente logado.
async function getCurrentUser() {
  if (currentSession?.user) {
    return currentSession.user
  }

  const sessionState = await ensureValidSessionState()
  if (sessionState.error) {
    console.error('Erro ao obter usuario atual', sessionState.error)
  }

  return sessionState.user ?? null
}

// Indica se um email corresponde ao administrador principal.
function isAdminEmail(email) {
  return String(email || '').trim().toLowerCase() === String(ADMIN_EMAIL).trim().toLowerCase()
}

function isAdminPortal() {
  return currentPortal === 'admin'
}

function isCurrentSessionSuperAdmin() {
  return Boolean(currentSession?.user?.email) && (isAdminEmail(currentSession.user.email) || platformContextCache?.global_role === 'super_admin')
}

function isCurrentSessionBarberPortalUser() {
  return platformContextCache?.global_role === BARBER_ROLE
}

function getGlobalRoleForPortalRole(role, currentGlobalRole = '') {
  const normalizedRole = normalizePortalRole(role)
  if (normalizedRole === BARBER_ROLE) {
    return BARBER_ROLE
  }

  if (normalizedRole === CUSTOMER_ROLE) {
    return CUSTOMER_ROLE
  }

  return currentGlobalRole === 'super_admin' ? 'super_admin' : 'user'
}

function buildMasterAdminContext(user, profile = null) {
  return {
    user_id: user?.id || '',
    email: user?.email || ADMIN_EMAIL,
    name: profile?.name || user?.user_metadata?.name || '',
    global_role: 'super_admin',
    profile_status: profile?.status || 'active',
    access: []
  }
}

async function resolvePortalForUser(user) {
  if (!user?.email) {
    return null
  }

  const context = await fetchPlatformContext()
  if (canAccessAdminPortal(user, context)) {
    return 'admin'
  }

  if (context?.global_role === BARBER_ROLE) {
    return 'barbeiro'
  }

  if (context) {
    const activeAccess = Array.isArray(context.access)
      ? context.access.filter((item) => item?.status === 'active')
      : []

    if (activeAccess.some((item) => item.role === 'client')) {
      return 'cliente'
    }
  }
  const { data: barberAccess, error: barberAccessError } = await supabaseClient
    .from('barber_access')
    .select('email, is_active')
    .eq('email', user.email)
    .eq('is_active', true)
    .maybeSingle()

  if (!barberAccessError && barberAccess?.email) {
    return 'barbeiro'
  }

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('role, global_role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.global_role === BARBER_ROLE) {
    return 'barbeiro'
  }

  return 'cliente'
}

async function handleUserAfterLogin(user, fallbackPortal = '') {
  let role = ''
  const context = await fetchPlatformContext()

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle()

  const profileStatus = String(profile?.status || context?.profile_status || 'active').trim().toLowerCase()
  const isSuperAdmin = canAccessAdminPortal(user, context)

  if (!isSuperAdmin && profileStatus === 'pending') {
    await supabaseClient.auth.signOut()
    currentSession = null
    clearPlatformContextCache()
    updateProtectedUi(false)
    applyPortalUi()
    showScreen('login')
    setAuthFeedback('Sua conta foi criada e esta aguardando aprovacao do super admin.', 'warning')
    return null
  }

  if (!isSuperAdmin && profileStatus === 'blocked') {
    await supabaseClient.auth.signOut()
    currentSession = null
    clearPlatformContextCache()
    updateProtectedUi(false)
    applyPortalUi()
    showScreen('login')
    setAuthFeedback('Seu acesso foi rejeitado ou bloqueado. Fale com o super admin.', 'error')
    return null
  }

  if (isSuperAdmin) {
    role = ADMIN_ROLE
  } else if (context?.global_role === BARBER_ROLE) {
    role = BARBER_ROLE
  } else if (profile?.role) {
    const normalizedProfileRole = normalizePortalRole(profile.role)
    role = normalizedProfileRole === BARBER_ROLE ? CUSTOMER_ROLE : normalizedProfileRole
  } else if (fallbackPortal) {
    role = fallbackPortal
  } else {
    role = await resolvePortalForUser(user)
  }

  if (role === ADMIN_ROLE) {
    setPortal('admin')
    applyPortalUi()
    if (!isAdminEntryPage()) {
      window.location.href = getAppUrl('admin.html')
      return role
    }

    showScreen('admin-dashboard')
    await carregarPortalData('admin-dashboard')
    return role
  }

  if (role === BARBER_ROLE) {
    setPortal('barbeiro')
    applyPortalUi()
    if (!isBarberEntryPage()) {
      window.location.href = getAppUrl('barbearia.html')
      return role
    }

    showScreen('gestao')
    await carregarPortalData('gestao')
    return role
  }

  if (!isClientEntryPage() && !isClientPublicView()) {
    window.location.href = getAppUrl('cliente.html')
    return CUSTOMER_ROLE
  }

  setPortal('cliente')
  applyPortalUi()
  showScreen('agendar')
  await carregarPortalData('agendar')
  return CUSTOMER_ROLE
}

// Valida se um usuario pode acessar o portal do barbeiro e sincroniza o perfil quando aprovado.
async function validateBarberPortalAccess(user) {
  if (!user?.email) {
    return {
      allowed: false,
      message: 'Nao foi possivel validar o email deste usuario.'
    }
  }

  const context = await fetchPlatformContext()
  if (context?.global_role !== BARBER_ROLE) {
    return {
      allowed: false,
      message: 'Somente perfis com regra global barbeiro podem acessar o portal da barbearia.'
    }
  }

  if (context) {
    const access = Array.isArray(context.access)
      ? context.access.find((item) => item?.status === 'active' && (item.role === 'admin' || item.role === 'barber'))
      : null

    if (!access?.barbershop_id) {
      return {
        allowed: false,
        message: 'Sua conta ainda nao possui acesso ativo ao portal da barbearia.'
      }
    }

    const synchronizedRole = access.role === 'admin' ? ADMIN_ROLE : BARBER_ROLE
    const { error: profileSyncError } = await upsertProfileRecord({
      id: user.id,
      email: user.email,
      role: synchronizedRole,
      barbershop_id: access.barbershop_id,
      status: 'active'
    })

    if (profileSyncError) {
      return {
        allowed: false,
        message: `Seu acesso foi encontrado, mas nao foi possivel sincronizar o perfil: ${profileSyncError.message}`
      }
    }

    currentBarbershopId = access.barbershop_id
    return { allowed: true }
  }

  if (isAdminEmail(user.email)) {
    return {
      allowed: false,
      message: 'Use o portal Administrador para entrar com a conta master.'
    }
  }

  const { data, error } = await supabaseClient
    .from('barber_access')
    .select('email, barbershop_id, is_active')
    .eq('email', user.email)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    return {
      allowed: false,
      message: `Nao foi possivel validar o acesso ao portal do barbeiro: ${error.message}`
    }
  }

  if (!data?.barbershop_id) {
    return {
      allowed: false,
      message: 'Seu email ainda nao foi liberado pelo administrador para acessar o portal do barbeiro.'
    }
  }

  const { error: profileError } = await upsertProfileRecord({
    id: user.id,
    email: user.email,
    role: BARBER_ROLE,
    barbershop_id: data.barbershop_id,
    status: 'active'
  })

  if (profileError) {
    return {
      allowed: false,
      message: `Seu acesso foi encontrado, mas nao foi possivel sincronizar o perfil: ${profileError.message}`
    }
  }

  currentBarbershopId = data.barbershop_id

  return { allowed: true }
}

async function validateAdminPortalAccess(user) {
  if (!user?.email) {
    return {
      allowed: false,
      message: 'Nao foi possivel validar o email deste usuario.'
    }
  }

  const context = await fetchPlatformContext()
  if (!canAccessAdminPortal(user, context)) {
    return {
      allowed: false,
      message: 'Somente usuarios com regra global super_admin podem acessar o portal do administrador.'
    }
  }

  currentBarbershopId = getAdminBarbershopContext()
  return { allowed: true }
}

// Faz a inicializacao da pagina ao abrir a aplicacao.
async function init() {
  try {
    applySavedTheme()
    if (warnIfRunningFromFileProtocol()) {
      return
    }

    const barbershop = await loadBarbershopBySlug()
    if (barbershop) {
      applyBranding(barbershop)
    }

    restorePortalSelection()
    updateAdminContextUi()
    bindEnterSubmit(['email', 'password'], () => {
      if (isSignupEntryPage()) {
        window.signup()
        return
      }

      window.login()
    })
    bindEnterSubmit(['signup-name', 'signup-phone'], () => {
      if (isSignupEntryPage()) {
        window.signup()
      }
    })
    bindEnterSubmit(['new-password', 'confirm-password'], () => {
      window.updatePassword()
    })

    const emailInput = document.getElementById('email')
    const barberInput = document.getElementById('barber')
    if (emailInput && !emailInput.dataset.boundPortalAccess) {
      emailInput.addEventListener('input', () => {
        updateLoginPortalUi()
      })
      emailInput.dataset.boundPortalAccess = 'true'
    }

    if (barberInput && !barberInput.dataset.boundSlots) {
      barberInput.addEventListener('change', () => {
        refreshAppointmentSlotPicker()
      })
      barberInput.dataset.boundSlots = 'true'
    }

    const { data } = await supabaseClient.auth.getSession()
    currentSession = data.session ?? null
    lastAuthAccessToken = data.session?.access_token || lastAuthAccessToken

    if (barbershop && !currentSession) {
      currentPortal = 'cliente'
      updateProtectedUi(false)
      applyPortalUi()
      showScreen('agendar')
      await carregarDados()
      return
    }

    const sessionState = await ensureValidSessionState()
    if (sessionState.error && !sessionState.session) {
      if (barbershop) {
        currentPortal = 'cliente'
        updateProtectedUi(false)
        applyPortalUi()
        showScreen('agendar')
        await carregarDados()
      }
      return
    }

    clearPlatformContextCache()

    if (isSignupConfirmationLanding() && sessionState.session && !isAdminEntryPage()) {
      await supabaseClient.auth.signOut()
      currentSession = null
      clearPlatformContextCache()
      currentBarbershopId = null
      updateProtectedUi(false)
      applyPortalUi()
      clearAuthCallbackParams()
      showScreen('login')
      setAuthFeedback('Email confirmado com sucesso. Agora faca login para acessar o sistema.', 'success')
      return
    }

    if (isAdminEntryPage()) {
      if (!sessionState.session?.user) {
        setPortal('admin')
        updateProtectedUi(false)
        applyPortalUi()
        showScreen('login')
        return
      }

      const accessResult = await validateAdminPortalAccess(sessionState.session.user)
      if (!accessResult.allowed) {
        await supabaseClient.auth.signOut()
        currentSession = null
        clearPlatformContextCache()
        currentBarbershopId = null
        updateProtectedUi(false)
        applyPortalUi()
        showScreen('login')
        setAuthFeedback(accessResult.message, 'error')
        return
      }

      setPortal('admin')
      updateProtectedUi(true)
      applyPortalUi()
      showScreen('admin-dashboard')
      await carregarPortalData('admin-dashboard')
      return
    } else {
      if (sessionState.session?.user) {
        updateProtectedUi(true)
        applyPortalUi()
        await handleUserAfterLogin(sessionState.session.user)
        return
      }

      applyPortalUi()
      showScreen(isSignupEntryPage() ? 'signup' : 'login')
      renderSelectState('barber', 'Faca login para carregar', true)
      renderServiceState('Faca login para carregar')
      renderAdminMessage('customers-admin-list', 'Faca login para gerenciar clientes.')
      renderAdminMessage('barbers-admin-list', 'Faca login para gerenciar barbeiros.')
      renderAdminMessage('services-admin-list', 'Faca login para gerenciar servicos.')
      renderAdminMessage('products-admin-list', 'Faca login para gerenciar produtos.')
      renderCatalogMessage('Faca login para visualizar os produtos.')
    }

    if (!authUiInitialized) {
      supabaseClient.auth.onAuthStateChange((_event, session) => {
        currentSession = session ?? null
        if (session?.access_token) {
          lastAuthAccessToken = session.access_token
        }
        clearPlatformContextCache()
        if (!session) {
          currentBarbershopId = null
        }
        updateProtectedUi(Boolean(session))
        applyPortalUi()
        updateAdminContextUi()
      })
      authUiInitialized = true
    }
  } finally {
    document.body?.classList.remove('app-loading')
    syncMobileMenuUi()
  }
}

// Define a menor data/hora permitida no input de agendamento.
function updateMinDateTime() {
  const timeInput = document.getElementById('time')

  if (!timeInput) {
    return
  }

  timeInput.min = getCurrentLocalDateTime()
}

// Retorna os servicos marcados no bloco de selecao.
function getSelectedServiceIds() {
  return Array.from(document.querySelectorAll('#service-options input[type="checkbox"]:checked'))
    .map((input) => input.value)
    .filter(Boolean)
}

// Limpa os servicos marcados no formulario de agendamento.
function clearSelectedServices() {
  document.querySelectorAll('#service-options input[type="checkbox"]').forEach((input) => {
    input.checked = false
  })
}

// Mostra um estado simples na area de servicos.
function renderServiceState(message) {
  const container = document.getElementById('service-options')

  if (!container) {
    return
  }

  container.innerHTML = `<div class="service-empty">${message}</div>`
  updateServiceTriggerLabel(message)
}

// Renderiza os servicos como opcoes clicaveis.
function renderServiceOptions(items) {
  const container = document.getElementById('service-options')

  if (!container) {
    return
  }

  const validItems = Array.isArray(items)
    ? items.filter((item) => item?.id && item?.name)
    : []

  serviceCatalogCache = validItems

  if (validItems.length === 0) {
    renderServiceState('Nenhum servico disponivel')
    return
  }

  container.innerHTML = validItems
    .map((item) => {
      return `
        <label class="service-option">
          <input type="checkbox" value="${item.id}" data-price="${Number(item.price || 0)}" onchange="handleServiceSelectionChange()">
          <span>${item.name}${item.price != null ? ` · ${formatCurrency(item.price)}` : ''}</span>
        </label>
      `
    })
    .join('')

  updateServiceTriggerLabel()
}

function getSelectedServiceRecords() {
  const selectedIds = new Set(getSelectedServiceIds())
  return serviceCatalogCache.filter((item) => selectedIds.has(item.id))
}

function getSelectedServicesTotalPrice() {
  return getSelectedServiceRecords().reduce((sum, item) => sum + Number(item.price || 0), 0)
}

function updateAppointmentPaymentSummary() {
  const summary = document.getElementById('appointment-payment-summary')
  const providerSelect = document.getElementById('appointment-payment-provider')

  if (!summary || !providerSelect) {
    return
  }

  const provider = providerSelect.value || 'none'
  const servicesTotal = getSelectedServicesTotalPrice()
  const depositAmount = servicesTotal > 0 ? Math.max(5, Number((servicesTotal * 0.2).toFixed(2))) : 0
  const providerLabel = provider === 'stripe'
    ? 'Stripe'
    : provider === 'mbway'
      ? 'MB Way'
      : 'Sem sinal'

  summary.innerHTML = `
    <div class="payment-summary-row">
      <span>Valor estimado dos servicos</span>
      <strong>${formatCurrency(servicesTotal)}</strong>
    </div>
    <div class="payment-summary-row">
      <span>Sinal de agendamento</span>
      <strong>${provider === 'none' ? 'Nao exigido' : formatCurrency(depositAmount)}</strong>
    </div>
    <div class="payment-summary-row">
      <span>Integracao prevista</span>
      <strong>${providerLabel}</strong>
    </div>
  `
}

window.handleServiceSelectionChange = async function () {
  updateServiceTriggerLabel()
  updateAppointmentPaymentSummary()
  await refreshAppointmentSlotPicker()
}

window.handlePaymentProviderChange = function () {
  updateAppointmentPaymentSummary()
}

// Gera a data local atual no formato aceito pelo datetime-local.
function getCurrentLocalDateTime() {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset() * 60000

  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

// Cadastra um novo barbeiro na barbearia do usuario.
window.cadastrarCliente = async function () {
  const nameInput = document.getElementById('new-customer-name')
  const phoneInput = document.getElementById('new-customer-phone')
  const emailInput = document.getElementById('new-customer-email')
  const name = nameInput?.value?.trim() || ''
  const phone = phoneInput?.value?.trim() || ''
  const email = emailInput?.value?.trim().toLowerCase() || ''

  if (!name) {
    alert('Informe o nome do cliente.')
    return
  }

  if (!phone) {
    alert('Informe o telefone do cliente.')
    return
  }

  if (!email) {
    alert('Informe o email do cliente.')
    return
  }

  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    alert(getTenantPortalMessage('Usuario nao logado'))
    return
  }

  const customerResult = await upsertCustomerRecord({
    barbershopId,
    name,
    phone,
    email
  })

  if (customerResult.missingTable) {
    alert('Crie a tabela customers no Supabase para registrar clientes por barbearia.')
    return
  }

  if (customerResult.error) {
    alert(`Erro ao cadastrar cliente: ${customerResult.error.message}`)
    return
  }

  nameInput.value = ''
  phoneInput.value = ''
  emailInput.value = ''
  await carregarClientesAdmin(barbershopId)
}

// Cadastra um novo barbeiro na barbearia do usuario.
window.cadastrarBarbeiro = async function () {
  const nameInput = document.getElementById('new-barber-name')
  const barbershopSelect = document.getElementById('new-barber-barbershop')
  const name = nameInput.value.trim()

  if (!name) {
    alert('Informe o nome do barbeiro.')
    return
  }

  const barbershopId = barbershopSelect?.value || await getBarbershop()
  if (!barbershopId) {
    alert('Selecione a barbearia para cadastrar o barbeiro.')
    return
  }

  const planCheck = await canCreateBarber(barbershopId)
  if (!planCheck.allowed) {
    alert(planCheck.message)
    return
  }

  const { error } = await supabaseClient
    .from('barbers')
    .insert([{ name, barbershop_id: barbershopId }])

  if (error) {
    alert(`Erro ao cadastrar barbeiro: ${error.message}`)
    return
  }

  nameInput.value = ''
  if (barbershopSelect && currentPortal !== 'admin') {
    barbershopSelect.value = barbershopId
  }
  await carregarDados()
  await carregarBarbeirosAdmin(barbershopId)
}

window.handleAdminUserPhotoChange = function () {
  const photoInput = document.getElementById('admin-user-photo')
  const feedback = document.getElementById('admin-user-create-feedback')

  if (!photoInput || !feedback) {
    return
  }

  if (photoInput.files && photoInput.files.length > 0) {
    showFormFeedback(`Foto selecionada: ${photoInput.files[0].name}`, 'info', 'admin-user-create-feedback')
  } else {
    showFormFeedback('', 'info', 'admin-user-create-feedback')
  }
}

window.cadastrarUsuarioAdmin = async function () {
  const nameInput = document.getElementById('admin-user-name')
  const emailInput = document.getElementById('admin-user-email')
  const phoneInput = document.getElementById('admin-user-phone')
  const barbershopSelect = document.getElementById('admin-user-barbershop')
  const passwordInput = document.getElementById('admin-user-password')
  const confirmPasswordInput = document.getElementById('admin-user-password-confirm')
  const roleSelect = document.getElementById('admin-user-role')
  const planSelect = document.getElementById('admin-user-plan')
  const feedbackId = 'admin-user-create-feedback'

  const name = nameInput?.value.trim() || ''
  const email = emailInput?.value.trim().toLowerCase() || ''
  const phone = phoneInput?.value.trim() || ''
  const barbershopId = barbershopSelect?.value || null
  const password = passwordInput?.value || ''
  const confirmPassword = confirmPasswordInput?.value || ''
  const role = roleSelect?.value || 'client'
  const planCode = planSelect?.value || 'free'

  if (!name) {
    showFormFeedback('Informe o nome completo.', 'error', feedbackId)
    return
  }

  if (!email) {
    showFormFeedback('Informe o email.', 'error', feedbackId)
    return
  }

  if (!phone) {
    showFormFeedback('Informe o telefone.', 'error', feedbackId)
    return
  }

  if (!password) {
    showFormFeedback('Informe a senha.', 'error', feedbackId)
    return
  }

  if (password.length < 6) {
    showFormFeedback('A senha deve ter pelo menos 6 caracteres.', 'error', feedbackId)
    return
  }

  if (password !== confirmPassword) {
    showFormFeedback('As senhas precisam ser iguais.', 'error', feedbackId)
    return
  }

  if ((role === 'barber' || role === 'admin') && !barbershopId) {
    showFormFeedback('Selecione a barbearia para usuarios administrativos ou barbeiros.', 'error', feedbackId)
    return
  }

  showFormFeedback('Criando usuario...', 'info', feedbackId)

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAppUrl('admin.html')
      }
    })

    if (error) {
      showFormFeedback(`Erro ao criar conta: ${error.message}`, 'error', feedbackId)
      return
    }

    const userId = data?.user?.id

    if (userId) {
      const { error: profileError } = await upsertProfileRecord({
        id: userId,
        email,
        name,
        phone,
        role,
        global_role: getGlobalRoleForPortalRole(role),
        barbershop_id: barbershopId,
        plan_code: planCode,
        status: 'pending'
      })

      if (profileError) {
        showFormFeedback(`Conta criada, mas falha ao salvar perfil: ${profileError.message}`, 'warning', feedbackId)
        return
      }
    }

    showFormFeedback('Usuario criado com sucesso e enviado para a fila de aprovacoes.', 'success', feedbackId)

    if (nameInput) nameInput.value = ''
    if (emailInput) emailInput.value = ''
    if (phoneInput) phoneInput.value = ''
    if (barbershopSelect) barbershopSelect.value = ''
    if (passwordInput) passwordInput.value = ''
    if (confirmPasswordInput) confirmPasswordInput.value = ''
    if (roleSelect) roleSelect.value = 'client'
    if (planSelect) planSelect.value = 'free'
    if (document.getElementById('admin-user-photo')) {
      document.getElementById('admin-user-photo').value = ''
    }

    await carregarAdminUsuarios()

    if (currentVisibleScreenId === 'aprovacoes' && currentPortal === 'admin') {
      await carregarAprovacoesAdmin()
    }
  } catch (err) {
    showFormFeedback(`Erro ao criar usuario: ${err.message || 'Tente novamente.'}`, 'error', feedbackId)
  }
}

// Cadastra um novo servico na barbearia do usuario.
window.cadastrarServico = async function () {
  const nameInput = document.getElementById('new-service-name')
  const descriptionInput = document.getElementById('new-service-description')
  const priceInput = document.getElementById('new-service-price')
  const name = nameInput.value.trim()
  const description = descriptionInput.value.trim()
  const price = priceInput.value.trim()

  if (!name) {
    alert('Informe o nome do servico.')
    return
  }

  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    alert(getTenantPortalMessage('Usuario nao logado'))
    return
  }

  const payload = { name, barbershop_id: barbershopId }

  if (description) {
    payload.description = description
  }

  if (price) {
    payload.price = Number(price)
  }

  const { error } = await supabaseClient
    .from('services')
    .insert([payload])

  if (error) {
    alert(`Erro ao cadastrar servico: ${error.message}`)
    return
  }

  nameInput.value = ''
  descriptionInput.value = ''
  priceInput.value = ''
  await carregarDados()
  await carregarServicosAdmin(barbershopId)
}

// Cadastra um novo produto para a barbearia.
window.cadastrarProduto = async function () {
  const nameInput = document.getElementById('new-product-name')
  const descriptionInput = document.getElementById('new-product-description')
  const priceInput = document.getElementById('new-product-price')
  const name = nameInput.value.trim()
  const description = descriptionInput.value.trim()
  const price = priceInput.value.trim()

  if (!name) {
    alert('Informe o nome do produto.')
    return
  }

  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    alert(getTenantPortalMessage('Usuario nao logado'))
    return
  }

  const payload = {
    name,
    barbershop_id: barbershopId
  }

  if (price) {
    payload.price = Number(price)
  }

  if (description) {
    payload.description = description
  }

  const { error } = await supabaseClient
    .from('products')
    .insert([payload])

  if (error) {
    alert(`Erro ao cadastrar produto: ${error.message}`)
    return
  }

  nameInput.value = ''
  descriptionInput.value = ''
  priceInput.value = ''
  await carregarProdutosAdmin(barbershopId)
}

// Registra uma venda de produto no caixa e tenta abater do estoque.
window.registrarVendaProduto = async function () {
  const productId = document.getElementById('sale-product-id')?.value
  const quantityValue = document.getElementById('sale-quantity')?.value?.trim() || ''
  const unitPriceValue = document.getElementById('sale-unit-price')?.value?.trim() || ''

  if (!productId) {
    alert('Selecione um produto para registrar a venda.')
    return
  }

  if (!quantityValue || Number.isNaN(Number(quantityValue)) || Number(quantityValue) <= 0) {
    alert('Informe uma quantidade valida.')
    return
  }

  if (!unitPriceValue || Number.isNaN(Number(unitPriceValue)) || Number(unitPriceValue) < 0) {
    alert('Informe um preco unitario valido.')
    return
  }

  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    alert('Usuario nao logado')
    return
  }

  const quantity = Number(quantityValue)
  const unitPrice = Number(unitPriceValue)
  const saleResult = await processProductSale(productId, quantity, unitPrice)

  if (!saleResult.success) {
    alert(`Erro ao registrar venda: ${saleResult.message}`)
    return
  }

  document.getElementById('sale-product-id').value = ''
  document.getElementById('sale-quantity').value = ''
  document.getElementById('sale-unit-price').value = ''

  await carregarGestao()
}

// Permite ao cliente comprar um produto pela vitrine.
window.comprarProduto = async function (productId) {
  openPurchaseModal(productId)
}

// Confirma a compra iniciada pela vitrine do cliente.
window.confirmarCompraProduto = async function () {
  const product = managementProductsCache.find((item) => item.id === purchaseModalProductId)

  if (!product) {
    alert('Produto nao encontrado.')
    return
  }

  const quantity = Number(document.getElementById('purchase-quantity')?.value || 0)
  const customerName = document.getElementById('purchase-customer-name')?.value?.trim() || ''
  const customerPhone = document.getElementById('purchase-customer-phone')?.value?.trim() || ''
  const customerEmail = document.getElementById('purchase-customer-email')?.value?.trim().toLowerCase() || ''

  if (!customerName) {
    alert('Informe seu nome para concluir a compra.')
    return
  }

  if (!customerPhone) {
    alert('Informe seu telefone para concluir a compra.')
    return
  }

  if (!customerEmail) {
    alert('Informe seu email para concluir a compra.')
    return
  }

  if (!quantity || Number.isNaN(quantity) || quantity <= 0) {
    alert('Informe uma quantidade valida.')
    return
  }

  const unitPrice = Number(product.price || 0)
  const saleResult = await processProductSale(product.id, quantity, unitPrice, {
    customerName,
    customerPhone,
    customerEmail
  })

  if (!saleResult.success) {
    alert(`Erro ao registrar compra: ${saleResult.message}`)
    return
  }

  fecharModalCompra()
  alert('Compra registrada com sucesso!')
  await carregarProdutos()
}

// Fecha o modal de compra do cliente.
window.fecharModalCompra = function (event) {
  if (event && event.target && event.currentTarget && event.target !== event.currentTarget) {
    return
  }

  const modal = document.getElementById('purchase-modal')
  if (!modal) {
    return
  }

  modal.style.display = 'none'
  purchaseModalProductId = null
}

// Atualiza o resumo financeiro exibido no modal de compra.
window.atualizarResumoCompra = function () {
  const product = managementProductsCache.find((item) => item.id === purchaseModalProductId)
  const quantity = Number(document.getElementById('purchase-quantity')?.value || 0)
  const unitPriceElement = document.getElementById('purchase-unit-price')
  const totalPriceElement = document.getElementById('purchase-total-price')

  if (!product || !unitPriceElement || !totalPriceElement) {
    return
  }

  const unitPrice = Number(product.price || 0)
  const total = quantity > 0 ? unitPrice * quantity : 0

  unitPriceElement.textContent = formatCurrency(unitPrice)
  totalPriceElement.textContent = formatCurrency(total)
}

// Abre o modal de compra preenchendo os dados do produto escolhido.
function openPurchaseModal(productId) {
  const product = managementProductsCache.find((item) => item.id === productId)

  if (!product) {
    alert('Produto nao encontrado.')
    return
  }

  purchaseModalProductId = productId

  const modal = document.getElementById('purchase-modal')
  const title = document.getElementById('purchase-modal-title')
  const description = document.getElementById('purchase-modal-description')
  const customerNameInput = document.getElementById('purchase-customer-name')
  const customerPhoneInput = document.getElementById('purchase-customer-phone')
  const customerEmailInput = document.getElementById('purchase-customer-email')
  const quantityInput = document.getElementById('purchase-quantity')

  if (!modal || !title || !description || !quantityInput || !customerNameInput || !customerPhoneInput || !customerEmailInput) {
    return
  }

  title.textContent = product.name
  description.textContent = product.description || 'Defina a quantidade desejada para confirmar a compra.'
  customerNameInput.value = ''
  customerPhoneInput.value = ''
  customerEmailInput.value = ''
  quantityInput.value = '1'
  quantityInput.max = product.stock_quantity != null ? String(product.stock_quantity) : ''
  modal.style.display = 'grid'
  atualizarResumoCompra()
  customerNameInput.focus()
}

// Executa a gravacao da venda/compra e atualiza o estoque quando necessario.
async function processProductSale(productId, quantity, unitPrice, customerData = {}) {
  const product = managementProductsCache.find((item) => item.id === productId)

  if (!product) {
    return { success: false, message: 'Produto nao encontrado.' }
  }

  if (product.stock_quantity != null && quantity > Number(product.stock_quantity || 0)) {
    return { success: false, message: 'Quantidade indisponivel em estoque.' }
  }

  const barbershopId = product.barbershop_id || await getBarbershop()
  if (!barbershopId) {
    return { success: false, message: 'Nao foi possivel identificar a barbearia do produto.' }
  }

  const totalAmount = quantity * unitPrice
  const salePayload = {
    product_id: productId,
    quantity,
    unit_price: unitPrice,
    total_amount: totalAmount,
    barbershop_id: barbershopId
  }

  if (customerData.customerName) {
    salePayload.customer_name = customerData.customerName
  }

  if (customerData.customerPhone) {
    salePayload.customer_phone = customerData.customerPhone
  }

  if (customerData.customerEmail) {
    salePayload.customer_email = customerData.customerEmail
  }

  let { error } = await supabaseClient
    .from('product_sales')
    .insert([salePayload])

  if (error && (error.message.includes('customer_name') || error.message.includes('customer_phone') || error.message.includes('customer_email'))) {
    const fallbackPayload = {
      product_id: productId,
      quantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      barbershop_id: barbershopId
    }

    const fallbackInsert = await supabaseClient
      .from('product_sales')
      .insert([fallbackPayload])

    error = fallbackInsert.error
  }

  if (error) {
    return { success: false, message: error.message }
  }

  const customerSyncResult = await upsertCustomerRecord({
    barbershopId,
    name: customerData.customerName,
    phone: customerData.customerPhone,
    email: customerData.customerEmail
  })

  if (customerSyncResult.error) {
    console.error('Erro ao sincronizar cliente apos compra', customerSyncResult.error)
  }

  if (product.stock_quantity != null) {
    const nextStock = Math.max(Number(product.stock_quantity || 0) - quantity, 0)
    const { error: stockError } = await supabaseClient
      .from('products')
      .update({ stock_quantity: nextStock })
      .eq('id', productId)

    if (stockError) {
      return { success: false, message: `Venda registrada, mas nao foi possivel atualizar o estoque: ${stockError.message}` }
    }
  }

  return { success: true }
}

// Atualiza o estoque manualmente para um produto cadastrado.
window.editarEstoqueProduto = async function (productId, currentStock) {
  const nextStock = prompt('Informe o estoque atual do produto:', currentStock ?? '0')

  if (nextStock === null) {
    return
  }

  const normalizedStock = nextStock.trim()

  if (normalizedStock === '' || Number.isNaN(Number(normalizedStock)) || Number(normalizedStock) < 0) {
    alert('Informe um estoque valido.')
    return
  }

  const { error } = await supabaseClient
    .from('products')
    .update({ stock_quantity: Number(normalizedStock) })
    .eq('id', productId)

  if (error) {
    alert(`Erro ao atualizar estoque: ${error.message}`)
    return
  }

  await carregarGestao()
}

// Apaga uma venda de produto e devolve a quantidade ao estoque quando disponivel.
window.deletarVendaProduto = async function (saleId, productId, quantitySold) {
  if (!confirm('Tem certeza que deseja apagar esta venda de produto?')) {
    return
  }

  const { error: deleteError } = await supabaseClient
    .from('product_sales')
    .delete()
    .eq('id', saleId)

  if (deleteError) {
    alert(`Erro ao apagar venda: ${deleteError.message}`)
    return
  }

  const cachedProduct = managementProductsCache.find((item) => item.id === productId)
  if (cachedProduct && cachedProduct.stock_quantity != null) {
    const { error: stockError } = await supabaseClient
      .from('products')
      .update({ stock_quantity: Number(cachedProduct.stock_quantity || 0) + Number(quantitySold || 0) })
      .eq('id', productId)

    if (stockError) {
      alert(`Venda apagada, mas nao foi possivel devolver ao estoque: ${stockError.message}`)
      await carregarGestao()
      return
    }
  }

  await carregarGestao()
}

// Lista padrao de barbeiros criada para contas de teste.
function getDefaultBarbers(barbershopId) {
  return [
    { name: 'Thiago', barbershop_id: barbershopId },
    { name: 'Rafael', barbershop_id: barbershopId },
    { name: 'Marcos', barbershop_id: barbershopId },
    { name: 'Joao', barbershop_id: barbershopId }
  ]
}

// Lista padrao de servicos criada para contas de teste.
function getDefaultServices(barbershopId) {
  return [
    { name: 'Corte tradicional', barbershop_id: barbershopId },
    { name: 'Corte degradê', barbershop_id: barbershopId },
    { name: 'Barba', barbershop_id: barbershopId },
    { name: 'Corte e barba', barbershop_id: barbershopId },
    { name: 'Sobrancelha', barbershop_id: barbershopId }
  ]
}

// Mostra apenas a tela solicitada e oculta as demais.
function showScreen(screenId) {
  const screenIds = ['login', 'signup', 'agendar', 'agenda', 'cadastros', 'produtos', 'gestao', 'aprovacoes', 'admin-dashboard', 'admin-barbershops', 'admin-access', 'admin-users', 'reset-password']
  currentVisibleScreenId = screenId
  closeMobileMenu()

  screenIds.forEach((id) => {
    const screen = document.getElementById(id)

    if (!screen) {
      return
    }

    screen.style.display = id === screenId ? 'block' : 'none'
  })

  document.querySelectorAll('.nav-button[data-screen]').forEach((button) => {
    const isActive = button.dataset.screen === screenId
    button.classList.toggle('is-active', isActive)
  })

  document.body.dataset.activeScreen = screenId
  updateTopbarScreenContext(screenId)
  updatePortalLandingUi()

  const content = document.querySelector('.content')
  if (content) {
    content.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Verifica se existe uma sessao ativa antes de abrir telas protegidas.
async function hasActiveSession() {
  const sessionState = await ensureValidSessionState()
  if (sessionState.error) {
    console.error('Erro ao verificar sessao', sessionState.error)
  }

  return Boolean(sessionState.session)
}

// Atualiza um select com um estado simples como carregando, erro ou vazio.
function renderSelectState(selectId, message, disabled = true) {
  const select = document.getElementById(selectId)

  if (!select) {
    return
  }

  select.innerHTML = `<option value="">${message}</option>`
  select.disabled = disabled
}

// Preenche um select com placeholder e opcoes vindas do banco.
function populateSelect(selectId, items, placeholder) {
  const select = document.getElementById(selectId)

  if (!select) {
    return
  }

  const validItems = Array.isArray(items)
    ? items.filter((item) => item?.id && item?.name)
    : []

  if (validItems.length === 0) {
    renderSelectState(selectId, `${placeholder} indisponivel`, true)
    return
  }

  select.disabled = false
  select.innerHTML = `<option value="">${placeholder}</option>`

  validItems.forEach((item) => {
    select.innerHTML += `<option value="${item.id}">${item.name}</option>`
  })
}

function buildCustomerFrequencyLabel(totalAppointments) {
  if (totalAppointments >= 6) {
    return 'Alta recorrencia'
  }

  if (totalAppointments >= 3) {
    return 'Retorno recorrente'
  }

  if (totalAppointments >= 1) {
    return 'Primeiros atendimentos'
  }

  return 'Sem historico'
}

function renderCustomerCrmList(containerId, customers, emptyMessage, previewMode = false) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  if (!customers.length) {
    renderAdminMessage(containerId, emptyMessage)
    return
  }

  container.innerHTML = customers
    .slice(0, previewMode ? 5 : customers.length)
    .map((item) => `
      <div class="management-row">
        <div>
          <strong>${item.name || 'Cliente sem nome'}</strong>
          <span class="management-meta">${[
            formatOptionalContactLine('Telefone', item.phone),
            formatOptionalContactLine('Email', item.email),
            `Historico de cortes: ${item.totalAppointments}`,
            `Ultimo atendimento: ${item.lastAppointmentLabel}`,
            `Frequencia: ${item.frequencyLabel}`
          ].filter(Boolean).join(' | ')}</span>
        </div>
        ${previewMode ? `<span class="management-badge">${item.frequencyLabel}</span>` : `
          <div class="admin-actions">
            <button type="button" onclick="deletarCadastro('customers', '${item.id}')">Apagar</button>
          </div>
        `}
      </div>
    `)
    .join('')
}

// Carrega a listagem administrativa de clientes.
async function carregarClientesAdmin(barbershopId, options = {}) {
  const { targetContainerId = 'customers-admin-list', previewMode = false } = options

  const { data, error } = await supabaseClient
    .from('customers')
    .select('id, name, phone, email')
    .eq('barbershop_id', barbershopId)
    .order('name', { ascending: true })

  const appointmentsResult = await supabaseClient
    .from('appointments')
    .select('id, customer_name, customer_email, appointment_time')
    .eq('barbershop_id', barbershopId)
    .order('appointment_time', { ascending: false })

  if (error) {
    if (isMissingTableError(error, 'customers')) {
      renderAdminMessage(targetContainerId, 'Crie a tabela customers para registrar os clientes da barbearia.')
      return
    }

    renderAdminMessage(targetContainerId, `Erro ao carregar clientes: ${error.message}`)
    return
  }

  const appointmentsByCustomer = new Map()

  ;(appointmentsResult.data || []).forEach((item) => {
    const key = String(item.customer_email || item.customer_name || '').trim().toLowerCase()
    if (!key) {
      return
    }

    const bucket = appointmentsByCustomer.get(key) || []
    bucket.push(item)
    appointmentsByCustomer.set(key, bucket)
  })

  customersCrmCache = (data || []).map((item) => {
    const historyKey = String(item.email || item.name || '').trim().toLowerCase()
    const history = appointmentsByCustomer.get(historyKey) || []
    const lastAppointment = history[0]?.appointment_time ? new Date(history[0].appointment_time) : null
    const daysSinceLastAppointment = lastAppointment
      ? Math.floor((Date.now() - lastAppointment.getTime()) / 86400000)
      : null
    return {
      ...item,
      totalAppointments: history.length,
      lastAppointmentLabel: lastAppointment ? lastAppointment.toLocaleDateString('pt-BR') : 'Sem atendimento',
      frequencyLabel: buildCustomerFrequencyLabel(history.length),
      daysSinceLastAppointment
    }
  })

  const searchTerm = document.getElementById('customer-search')?.value?.trim().toLowerCase() || ''
  const filteredCustomers = customersCrmCache.filter((item) => {
    if (!searchTerm) {
      return true
    }

    return [item.name, item.phone, item.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchTerm))
  })

  renderCustomerCrmList(
    targetContainerId,
    filteredCustomers,
    previewMode ? 'Nenhum cliente com historico para exibir.' : 'Nenhum cliente cadastrado.',
    previewMode
  )
}

window.filtrarClientesCadastrados = function () {
  renderCustomerCrmList('customers-admin-list', customersCrmCache.filter((item) => {
    const searchTerm = document.getElementById('customer-search')?.value?.trim().toLowerCase() || ''
    if (!searchTerm) {
      return true
    }

    return [item.name, item.phone, item.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchTerm))
  }), 'Nenhum cliente encontrado.')
}

// Carrega a listagem administrativa de barbeiros.
async function carregarBarbeirosAdmin(barbershopId) {
  const { data, error } = await supabaseClient
    .from('barbers')
    .select('id, name')
    .eq('barbershop_id', barbershopId)
    .order('name', { ascending: true })

  if (error) {
    renderAdminMessage('barbers-admin-list', `Erro ao carregar barbeiros: ${error.message}`)
    return
  }

  renderAdminItems('barbers-admin-list', data, 'Nenhum barbeiro cadastrado.', 'barbers')
}

// Carrega a listagem administrativa de servicos.
async function carregarServicosAdmin(barbershopId) {
  const { data, error } = await supabaseClient
    .from('services')
    .select('id, name, description, price')
    .eq('barbershop_id', barbershopId)
    .order('name', { ascending: true })

  if (error) {
    renderAdminMessage('services-admin-list', `Erro ao carregar servicos: ${error.message}`)
    return
  }

  const formattedServices = (data || []).map((item) => ({
    ...item,
    meta: buildMetaText(item.description, item.price)
  }))

  renderAdminItems('services-admin-list', formattedServices, 'Nenhum servico cadastrado.', 'services')
}

// Carrega a listagem administrativa de produtos.
async function carregarProdutosAdmin(barbershopId) {
  const { data, error } = await supabaseClient
    .from('products')
    .select('id, name, description, price')
    .eq('barbershop_id', barbershopId)
    .order('name', { ascending: true })

  if (error) {
    renderAdminMessage('products-admin-list', `Erro ao carregar produtos: ${error.message}`)
    return
  }

  const formattedProducts = (data || []).map((item) => ({
    ...item,
    meta: buildMetaText(item.description, item.price)
  }))

  renderAdminItems('products-admin-list', formattedProducts, 'Nenhum produto cadastrado.', 'products')
}

// Busca os produtos com suporte opcional ao controle de estoque.
async function fetchManagementProducts(barbershopId) {
  let stockQueryBuilder = supabaseClient
    .from('products')
    .select('id, name, description, price, stock_quantity, barbershop_id')
    .order('name', { ascending: true })

  if ((currentPortal === 'barbeiro' || currentPortal === 'admin') && barbershopId) {
    stockQueryBuilder = stockQueryBuilder.eq('barbershop_id', barbershopId)
  }

  const stockQuery = await stockQueryBuilder

  if (!stockQuery.error) {
    return {
      items: stockQuery.data || [],
      stockSupported: true,
      errorMessage: ''
    }
  }

  let fallbackQueryBuilder = supabaseClient
    .from('products')
    .select('id, name, description, price, barbershop_id')
    .order('name', { ascending: true })

  if (barbershopId) {
    fallbackQueryBuilder = fallbackQueryBuilder.eq('barbershop_id', barbershopId)
  }

  const fallbackQuery = await fallbackQueryBuilder

  if (fallbackQuery.error) {
    return {
      items: [],
      stockSupported: false,
      errorMessage: `Erro ao carregar produtos: ${fallbackQuery.error.message}`
    }
  }

  return {
    items: fallbackQuery.data || [],
    stockSupported: false,
    errorMessage: 'Adicione a coluna stock_quantity na tabela products para controlar estoque.'
  }
}

// Busca agendamentos com relacoes de servico e barbeiro para calculos financeiros.
async function fetchAppointmentsWithRelations(barbershopId) {
  let query = await supabaseClient
    .from('appointments')
    .select(`
      id,
      appointment_time,
      customer_name,
      status,
      finalized_at,
      services (
        name,
        price
      ),
      barbers (
        name
      )
    `)
    .eq('barbershop_id', barbershopId)
    .eq('status', 'finalized')
    .order('appointment_time', { ascending: false })

  if (query.error && isMissingAppointmentWorkflowColumnsError(query.error)) {
    appointmentWorkflowSupport = false
    query = await supabaseClient
      .from('appointments')
      .select(`
        id,
        appointment_time,
        customer_name,
        services (
          name,
          price
        ),
        barbers (
          name
        )
      `)
      .eq('barbershop_id', barbershopId)
      .order('appointment_time', { ascending: false })
  } else if (!query.error) {
    appointmentWorkflowSupport = true
  }

  return {
    items: query.data || [],
    error: query.error
  }
}

async function fetchUpcomingAppointments(barbershopId) {
  const query = await supabaseClient
    .from('appointments')
    .select('id, customer_name, customer_phone, customer_email, appointment_time')
    .eq('barbershop_id', barbershopId)
    .gte('appointment_time', new Date().toISOString())
    .order('appointment_time', { ascending: true })

  return {
    items: query.data || [],
    error: query.error
  }
}

// Busca os servicos realizados como fonte principal do financeiro.
async function fetchServiceSales(barbershopId) {
  const query = await supabaseClient
    .from('service_sales')
    .select(`
      id,
      service_price,
      customer_name,
      performed_at,
      services (
        name
      ),
      barbers (
        name
      )
    `)
    .eq('barbershop_id', barbershopId)
    .order('performed_at', { ascending: false })

  return {
    items: query.data || [],
    error: query.error
  }
}

// Busca vendas de produtos se a tabela product_sales existir.
async function fetchProductSales(barbershopId) {
  const query = await supabaseClient
    .from('product_sales')
    .select(`
      id,
      product_id,
      quantity,
      unit_price,
      total_amount,
      created_at,
      products (
        name
      )
    `)
    .eq('barbershop_id', barbershopId)
    .order('created_at', { ascending: false })
    .limit(12)

  return {
    items: query.data || [],
    error: query.error
  }
}

// Renderiza os produtos em formato de vitrine para o portal do cliente.
function renderProductsCatalog(items, stockSupported = false) {
  const container = document.getElementById('products-catalog-list')
  if (!container) {
    return
  }

  if (!Array.isArray(items) || items.length === 0) {
    renderCatalogMessage('Nenhum produto disponivel no momento.')
    return
  }

  container.innerHTML = items
    .map((item) => {
      const description = item.description
        ? `<span class="catalog-meta">${item.description}</span>`
        : '<span class="catalog-meta">Produto sem descricao cadastrada.</span>'
      const price = item.price != null
        ? `<strong class="catalog-price">R$ ${Number(item.price).toFixed(2)}</strong>`
        : '<strong class="catalog-price">Consulte no local</strong>'
      const stockLabel = stockSupported
        ? `<span class="catalog-stock">Estoque: ${item.stock_quantity ?? 0} unidade(s)</span>`
        : ''
      const canBuy = currentPortal === 'cliente'
      const buyButton = canBuy
        ? `<button class="catalog-action" onclick="comprarProduto('${item.id}')">Comprar produto</button>`
        : ''

      return `
        <article class="catalog-card">
          <span class="catalog-kicker">Produto</span>
          <h2>${item.name}</h2>
          ${description}
          ${stockLabel}
          ${price}
          ${buyButton}
        </article>
      `
    })
    .join('')
}

function renderAgendaVisual(items) {
  const container = document.getElementById('lista')
  if (!container) {
    return
  }

  const appointments = Array.isArray(items) ? items : []

  if (!appointments.length) {
    renderHistoryMessage('lista', 'Nenhum agendamento encontrado.')
    return
  }

  if (!selectedAgendaDay) {
    selectedAgendaDay = formatDateKey(buildUpcomingDays(1)[0])
  }

  const filteredItems = appointments.filter((item) => {
    const itemDay = formatDateKey(new Date(item.appointment_time))
    if (agendaViewMode === 'day') {
      return itemDay === selectedAgendaDay
    }

    const allowedDays = new Set(buildUpcomingDays(7).map((date) => formatDateKey(date)))
    return allowedDays.has(itemDay)
  })

  if (!filteredItems.length) {
    renderHistoryMessage('lista', agendaViewMode === 'day'
      ? 'Nenhum atendimento para o dia selecionado.'
      : 'Nenhum atendimento para esta semana.')
    return
  }

  const groupedByDay = filteredItems.reduce((map, item) => {
    const date = new Date(item.appointment_time)
    const dayKey = formatDateKey(date)
    const bucket = map.get(dayKey) || []
    bucket.push(item)
    map.set(dayKey, bucket)
    return map
  }, new Map())

  container.innerHTML = Array.from(groupedByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, dayItems]) => {
      const date = new Date(`${dayKey}T00:00:00`)
      const rows = dayItems
        .sort((a, b) => new Date(a.appointment_time) - new Date(b.appointment_time))
        .map((item) => {
          const timeLabel = formatHourLabel(new Date(item.appointment_time))
          const status = item.status === 'finalized' ? 'Finalizado' : 'Agendado'
          return `
            <div class="agenda-visual-row">
              <div class="agenda-visual-time">${timeLabel}</div>
              <div class="agenda-visual-content">
                <strong>${item.customer_name || 'Cliente sem nome'}</strong>
                <span class="agenda-meta">${item.barbers?.name || 'Barbeiro'} · ${item.services?.name || 'Servico'}</span>
                <span class="agenda-meta">${status}</span>
              </div>
            </div>
          `
        })
        .join('')

      return `
        <section class="agenda-visual-day">
          <div class="agenda-visual-day-header">
            <strong>${date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}</strong>
            <span class="management-badge">${dayItems.length} horarios</span>
          </div>
          <div class="agenda-visual-grid">
            ${rows}
          </div>
        </section>
      `
    })
    .join('')
}

// Exibe mensagens simples na vitrine de produtos.
function renderCatalogMessage(message) {
  const container = document.getElementById('products-catalog-list')
  if (!container) {
    return
  }

  container.innerHTML = `<div class="admin-empty">${message}</div>`
}

// Renderiza cards de agendamento em listas reutilizaveis.
function renderAppointmentCards(containerId, items, emptyMessage) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  if (!Array.isArray(items) || items.length === 0) {
    renderHistoryMessage(containerId, emptyMessage)
    return
  }

  container.innerHTML = items
    .map((item) => {
      const isFinalized = item.status === 'finalized'
      const barberName = item.barbers?.name ? `<span class="agenda-meta">Barbeiro: ${item.barbers.name}</span>` : ''
      const serviceName = item.services?.name ? `<span class="agenda-meta">Servico: ${item.services.name}</span>` : ''
      const serviceDescription = item.services?.description
        ? `<span class="agenda-meta">${item.services.description}</span>`
        : ''
      const servicePrice = item.services?.price != null
        ? `<span class="agenda-meta">Preco: R$ ${Number(item.services.price).toFixed(2)}</span>`
        : ''
      const appointmentDate = `<span class="agenda-meta">${new Date(item.appointment_time).toLocaleString()}</span>`
      const statusChip = item.status
        ? `<span class="status-chip ${isFinalized ? 'status-chip-finalized' : 'status-chip-scheduled'}">${isFinalized ? 'Finalizado' : 'Agendado'}</span>`
        : ''
      const finalizedMeta = item.finalized_at
        ? `<span class="agenda-meta">Finalizado em: ${new Date(item.finalized_at).toLocaleString()}</span>`
        : ''
      const actions = []

      if (containerId === 'lista' && !isFinalized && appointmentWorkflowSupport !== false) {
        actions.push(`<button onclick="finalizarAgendamento('${item.id}')">Finalizar</button>`)
      }

      if (containerId === 'lista') {
        actions.push(`<button class="danger-action" onclick="deletarAgendamento('${item.id}')">Apagar</button>`)
      }

      const actionButtons = actions.length > 0
        ? `<div class="agenda-actions">${actions.join('')}</div>`
        : ''

      return `
        <div class="agenda-card">
          <strong>${item.customer_name}</strong>
          ${statusChip}
          ${barberName}
          ${serviceName}
          ${serviceDescription}
          ${servicePrice}
          ${appointmentDate}
          ${finalizedMeta}
          ${actionButtons}
        </div>
      `
    })
    .join('')
}

// Exibe uma mensagem simples nas listas de historico.
function renderHistoryMessage(containerId, message) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  container.innerHTML = `<div class="admin-empty">${message}</div>`
}

// Preenche o select usado para registrar uma venda de produto.
function populateSaleProducts(items) {
  const select = document.getElementById('sale-product-id')
  if (!select) {
    return
  }

  select.innerHTML = '<option value="">Selecione o produto</option>'

  items.forEach((item) => {
    const option = document.createElement('option')
    option.value = item.id
    option.textContent = item.name
    option.dataset.price = item.price ?? ''
    select.appendChild(option)
  })

  select.onchange = function () {
    const selected = items.find((item) => item.id === select.value)
    const unitPriceInput = document.getElementById('sale-unit-price')

    if (!unitPriceInput) {
      return
    }

    unitPriceInput.value = selected?.price != null ? Number(selected.price).toFixed(2) : ''
  }
}

// Exibe um resumo dos principais indicadores de gestao.
function renderManagementSummary(serviceSalesResult, appointmentsResult, productSalesResult) {
  const container = document.getElementById('management-summary')
  if (!container) {
    return
  }

  const serviceRevenueSource = getServiceRevenueSource(serviceSalesResult, appointmentsResult)

  if (serviceRevenueSource.error) {
    renderManagementMessage('management-summary', `Erro ao carregar indicadores: ${serviceRevenueSource.error.message}`)
    return
  }

  const serviceRevenue = sumServiceRevenue(serviceRevenueSource.items, serviceRevenueSource.mode)
  const productRevenue = productSalesResult.error ? 0 : sumProductSalesRevenue(productSalesResult.items)
  const totalRevenue = serviceRevenue + productRevenue
  const appointmentsCount = serviceRevenueSource.items.length
  const now = new Date()
  const todayKey = formatDateKey(now)
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const dailyRevenue = (serviceRevenueSource.items || []).reduce((sum, item) => {
    const date = new Date(item.performed_at || item.appointment_time)
    const itemDayKey = formatDateKey(date)
    return itemDayKey === todayKey ? sum + getServiceRevenueValue(item, serviceRevenueSource.mode) : sum
  }, 0) + (productSalesResult.items || []).reduce((sum, item) => {
    const date = new Date(item.created_at)
    return formatDateKey(date) === todayKey ? sum + Number(item.total_amount || 0) : sum
  }, 0)
  const monthlyRevenue = (serviceRevenueSource.items || []).reduce((sum, item) => {
    const date = new Date(item.performed_at || item.appointment_time)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
      ? sum + getServiceRevenueValue(item, serviceRevenueSource.mode)
      : sum
  }, 0) + (productSalesResult.items || []).reduce((sum, item) => {
    const date = new Date(item.created_at)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
      ? sum + Number(item.total_amount || 0)
      : sum
  }, 0)
  const averageTicket = appointmentsCount > 0 ? totalRevenue / appointmentsCount : 0

  const cards = [
    { label: 'Caixa total', value: formatCurrency(totalRevenue) },
    { label: 'Faturamento diario', value: formatCurrency(dailyRevenue) },
    { label: 'Faturamento mensal', value: formatCurrency(monthlyRevenue) },
    { label: 'Ticket medio', value: formatCurrency(averageTicket) },
    { label: 'Vendas de produtos', value: productSalesResult.error ? 'Tabela ausente' : formatCurrency(productRevenue) },
    { label: 'Atendimentos registrados', value: String(appointmentsCount) }
  ]

  container.innerHTML = cards
    .map((card) => `
      <article class="metric-card">
        <span class="metric-label">${card.label}</span>
        <strong class="metric-value">${card.value}</strong>
      </article>
    `)
    .join('')
}

async function renderPlanUsage(barbershopId) {
  const usage = await getPlanUsage(barbershopId)
  currentSubscriptionCache = usage.subscription

  const rows = [
    {
      title: buildPlanBadge(usage.plan.code),
      meta: `Agendamentos no mes: ${usage.appointmentsCount}/${usage.plan.maxAppointmentsPerMonth} | Barbeiros: ${usage.barbersCount}/${usage.plan.maxBarbers}`,
      value: usage.plan.multiBarbershop ? 'Multi-barbearia' : 'Unidade unica'
    }
  ]

  if (usage.missingSubscriptionTable) {
    rows.push({
      title: 'Modo fallback ativo',
      meta: 'Crie a tabela saas_subscriptions para persistir o plano da unidade.',
      value: 'Manual'
    })
  }

  renderManagementRows('plan-usage-list', rows, 'Nenhum plano encontrado.')
}

function renderReturnAlerts(customers) {
  const staleCustomers = (customers || [])
    .filter((item) => item.totalAppointments > 0 && item.daysSinceLastAppointment != null && item.daysSinceLastAppointment >= 30)
    .sort((a, b) => b.daysSinceLastAppointment - a.daysSinceLastAppointment)
    .slice(0, 6)
    .map((item) => ({
      title: item.name || 'Cliente sem nome',
      meta: `${item.daysSinceLastAppointment} dia(s) sem voltar | Ultimo atendimento: ${item.lastAppointmentLabel}`,
      value: item.frequencyLabel
    }))

  renderManagementRows('return-alerts-list', staleCustomers, 'Nenhum cliente com alerta de retorno no momento.')
}

// Exibe a lista de estoque ou a orientacao para habilitar a coluna de estoque.
function renderStockList(items, stockSupported, errorMessage = '') {
  const container = document.getElementById('stock-list')
  if (!container) {
    return
  }

  if (errorMessage && items.length === 0) {
    renderManagementMessage('stock-list', errorMessage)
    return
  }

  if (!Array.isArray(items) || items.length === 0) {
    renderManagementMessage('stock-list', 'Nenhum produto cadastrado para controlar estoque.')
    return
  }

  if (!stockSupported) {
    container.innerHTML = `
      <div class="admin-empty">${errorMessage || 'Adicione a coluna stock_quantity na tabela products para controlar estoque.'}</div>
      ${items.map((item) => `
        <div class="management-row">
          <div>
            <strong>${item.name}</strong>
            <span class="management-meta">${item.description || 'Sem descricao cadastrada.'}</span>
          </div>
          <span class="management-badge">Sem estoque</span>
        </div>
      `).join('')}
    `
    return
  }

  container.innerHTML = items
    .map((item) => `
      <div class="management-row">
        <div>
          <strong>${item.name}</strong>
          <span class="management-meta">Em estoque: ${item.stock_quantity ?? 0} unidade(s)</span>
        </div>
        <button class="edit-button" onclick="editarEstoqueProduto('${item.id}', '${item.stock_quantity ?? 0}')">Atualizar estoque</button>
      </div>
    `)
    .join('')
}

// Exibe os valores de servicos a partir dos agendamentos registrados.
function renderServiceRevenue(serviceSalesResult, appointmentsResult) {
  const source = getServiceRevenueSource(serviceSalesResult, appointmentsResult)

  if (source.error) {
    renderManagementMessage('services-revenue-list', `Erro ao carregar servicos: ${source.error.message}`)
    return
  }

  const grouped = new Map()

  source.items.forEach((item) => {
    const serviceName = item.services?.name || 'Servico sem nome'
    const current = grouped.get(serviceName) || { count: 0, total: 0 }
    current.count += 1
    current.total += getServiceRevenueValue(item, source.mode)
    grouped.set(serviceName, current)
  })

  const rows = Array.from(grouped.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, data]) => ({
      title: name,
      meta: `${data.count} atendimento(s)`,
      value: formatCurrency(data.total)
    }))

  renderManagementRows(
    'services-revenue-list',
    rows,
    source.mode === 'service_sales'
      ? 'Nenhum servico realizado ainda.'
      : 'Nenhum servico realizado ainda. Aguardando registros em service_sales.'
  )
}

function renderTopServices(serviceSalesResult, appointmentsResult) {
  const source = getServiceRevenueSource(serviceSalesResult, appointmentsResult)

  if (source.error) {
    renderManagementMessage('top-services-list', `Erro ao carregar ranking: ${source.error.message}`)
    return
  }

  const grouped = new Map()

  source.items.forEach((item) => {
    const serviceName = item.services?.name || 'Servico sem nome'
    const current = grouped.get(serviceName) || { count: 0, total: 0 }
    current.count += 1
    current.total += getServiceRevenueValue(item, source.mode)
    grouped.set(serviceName, current)
  })

  const totalSales = source.items.length
  const rows = Array.from(grouped.entries())
    .sort((a, b) => {
      if (b[1].count !== a[1].count) {
        return b[1].count - a[1].count
      }

      return b[1].total - a[1].total
    })
    .slice(0, 5)
    .map(([name, data]) => {
      const share = totalSales > 0 ? Math.round((data.count / totalSales) * 100) : 0
      return {
        title: name,
        meta: `${data.count} venda(s) | ${share}% da demanda`,
        value: formatCurrency(data.total)
      }
    })

  renderManagementRows(
    'top-services-list',
    rows,
    source.mode === 'service_sales'
      ? 'Nenhum servico vendido ainda.'
      : 'Nenhum servico vendido ainda. Aguardando registros em service_sales.'
  )
}

// Exibe o faturamento total gerado por cada barbeiro cadastrado.
function renderBarberRevenue(serviceSalesResult, appointmentsResult) {
  const source = getServiceRevenueSource(serviceSalesResult, appointmentsResult)

  if (source.error) {
    renderManagementMessage('barber-revenue-list', `Erro ao carregar barbeiros: ${source.error.message}`)
    return
  }

  const grouped = new Map()

  source.items.forEach((item) => {
    const barberName = item.barbers?.name || 'Barbeiro sem nome'
    const current = grouped.get(barberName) || { count: 0, total: 0 }
    current.count += 1
    current.total += getServiceRevenueValue(item, source.mode)
    grouped.set(barberName, current)
  })

  const rows = Array.from(grouped.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, data]) => ({
      title: name,
      meta: `${data.count} atendimento(s)`,
      value: formatCurrency(data.total)
    }))

  renderManagementRows(
    'barber-revenue-list',
    rows,
    source.mode === 'service_sales'
      ? 'Nenhum faturamento por barbeiro registrado ainda.'
      : 'Nenhum faturamento por barbeiro registrado ainda. Aguardando registros em service_sales.'
  )
}

// Exibe as ultimas vendas de produtos no painel de gestao.
function renderProductSales(productSalesResult) {
  if (productSalesResult.error) {
    renderManagementMessage('sales-list', 'Crie a tabela product_sales para registrar vendas de produtos.')
    return
  }

  const container = document.getElementById('sales-list')
  if (!container) {
    return
  }

  if (!Array.isArray(productSalesResult.items) || productSalesResult.items.length === 0) {
    renderManagementMessage('sales-list', 'Nenhuma venda de produto registrada ainda.')
    return
  }

  container.innerHTML = productSalesResult.items
    .map((item) => `
      <div class="management-row">
        <div>
          <strong>${item.products?.name || 'Produto sem nome'}</strong>
          <span class="management-meta">${item.quantity || 0} unidade(s) | ${new Date(item.created_at).toLocaleString()}</span>
        </div>
        <div class="management-actions">
          <span class="management-value">${formatCurrency(item.total_amount || 0)}</span>
          <button class="edit-button" onclick="deletarVendaProduto('${item.id}', '${item.product_id}', '${item.quantity || 0}')">Apagar venda</button>
        </div>
      </div>
    `)
    .join('')
}

function buildNotificationQueue(appointments) {
  const now = new Date()

  return (appointments || [])
    .filter((item) => {
      const appointmentDate = new Date(item.appointment_time)
      return appointmentDate >= now
    })
    .sort((a, b) => new Date(a.appointment_time) - new Date(b.appointment_time))
    .slice(0, 6)
    .map((item) => {
      const appointmentDate = new Date(item.appointment_time)
      const diffInMinutes = Math.round((appointmentDate.getTime() - now.getTime()) / 60000)
      const type = diffInMinutes <= 60 ? 'Lembrete 1h antes' : 'Confirmacao'
      const preferredChannel = item.customer_phone
        ? 'WhatsApp API'
        : item.customer_email
          ? 'Email'
          : 'Canal pendente'
      const scheduledFor = diffInMinutes <= 60
        ? 'Enviar agora'
        : `Agendado para ${appointmentDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

      return {
        customerName: item.customer_name || 'Cliente sem nome',
        appointmentLabel: appointmentDate.toLocaleString('pt-BR'),
        type,
        preferredChannel,
        scheduledFor
      }
    })
}

function renderNotificationsCenter(appointments) {
  const container = document.getElementById('notifications-list')
  if (!container) {
    return
  }

  const notificationQueue = buildNotificationQueue(appointments)

  if (!notificationQueue.length) {
    renderManagementMessage('notifications-list', 'Nenhum agendamento futuro para confirmar ou lembrar.')
    return
  }

  container.innerHTML = notificationQueue
    .map((item) => {
      return `
        <div class="management-row">
          <div>
            <strong>${item.customerName}</strong>
            <span class="management-meta">${item.appointmentLabel} | ${item.type}</span>
            <span class="management-meta">${item.scheduledFor} | Canal prioritario: ${item.preferredChannel}</span>
          </div>
          <span class="management-badge">${item.type}</span>
        </div>
      `
    })
    .join('')
}

// Renderiza uma lista padrao de linhas para a pagina de gestao.
function renderManagementRows(containerId, rows, emptyMessage) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    renderManagementMessage(containerId, emptyMessage)
    return
  }

  container.innerHTML = rows
    .map((row) => `
      <div class="management-row">
        <div>
          <strong>${row.title}</strong>
          <span class="management-meta">${row.meta}</span>
        </div>
        <span class="management-value">${row.value}</span>
      </div>
    `)
    .join('')
}

// Exibe uma mensagem simples nos blocos da area de gestao.
function renderManagementMessage(containerId, message) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  container.innerHTML = `<div class="admin-empty">${message}</div>`
}

// Exibe mensagens no bloco administrativo de autorizacao do portal barbeiro.
function renderAccessManagementMessage(message) {
  const card = document.getElementById('access-management-card')
  const container = document.getElementById('approved-barbers-list')

  if (card) {
    card.style.display = 'block'
  }

  if (!container) {
    return
  }

  container.innerHTML = `<div class="admin-empty">${message}</div>`
}

function getApprovalRoleLabel(role) {
  const normalizedRole = normalizePortalRole(role)
  if (normalizedRole === ADMIN_ROLE) return 'Admin'
  if (normalizedRole === BARBER_ROLE) return 'Barbeiro'
  return 'Cliente'
}

function getAdminPendingApprovalEntry(userId) {
  return adminPendingApprovalsCache.find((item) => item.id === userId) || null
}

function updateApprovalsScreenLayout(isAdminApprovals) {
  const title = document.getElementById('approvals-screen-title')
  const description = document.getElementById('approvals-screen-description')
  const adminCard = document.getElementById('admin-user-approvals-card')
  const barberCard = document.getElementById('access-management-card')

  if (title) {
    title.textContent = isAdminApprovals ? 'Aprovacoes de novos usuarios' : 'Aprovacoes do portal da barbearia'
  }

  if (description) {
    description.textContent = isAdminApprovals
      ? 'Revise os cadastros pendentes, identifique o tipo de acesso e aprove ou rejeite a entrada no portal.'
      : 'Libere manualmente os emails que podem entrar no portal completo da unidade selecionada.'
  }

  if (adminCard) {
    adminCard.style.display = isAdminApprovals ? 'block' : 'none'
  }

  if (barberCard) {
    barberCard.style.display = isAdminApprovals ? 'none' : 'block'
  }
}

function renderAdminUserApprovals(items, barbershopNameById = new Map()) {
  const container = document.getElementById('admin-user-approvals-list')
  if (!container) {
    return
  }

  if (!items.length) {
    renderManagementMessage('admin-user-approvals-list', 'Nenhum usuario aguardando aprovacao no momento.')
    return
  }

  container.innerHTML = `
    <div class="management-table-wrapper">
      <table class="management-table approval-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Perfil</th>
            <th>Portal</th>
            <th>Contexto</th>
            <th>Criado em</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td>
                <div class="approval-user-cell">
                  <strong>${item.name || item.email || 'Usuario sem nome'}</strong>
                  <span>${item.email || '-'}</span>
                </div>
              </td>
              <td><span class="role-badge ${getRoleBadgeMeta(item.role).className}">${getApprovalRoleLabel(item.role)}</span></td>
              <td>${getApprovalRoleLabel(item.role)}</td>
              <td>${item.barbershop_id ? (barbershopNameById.get(item.barbershop_id) || item.barbershop_id) : 'Sem barbearia'}</td>
              <td>${formatAdminDate(item.created_at)}</td>
              <td>
                <div class="approval-actions">
                  <button type="button" class="edit-button" onclick="aprovarUsuarioPendenteAdmin('${item.id}')">Aprovar</button>
                  <button type="button" class="danger-action" onclick="rejeitarUsuarioPendenteAdmin('${item.id}')">Rejeitar</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

async function carregarAprovacoesAdmin() {
  const currentUser = await ensureAdminAccess()
  updateApprovalsScreenLayout(true)

  if (!currentUser) {
    renderManagementMessage('admin-user-approvals-list', 'Somente usuarios com permissao de super admin podem gerenciar aprovacoes.')
    return
  }

  showFormFeedback('Carregando fila de aprovacoes...', 'info', 'admin-user-approvals-feedback')

  let profilesResult = await supabaseClient
    .from('profiles')
    .select('id, email, name, phone, role, status, barbershop_id, created_at, global_role')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (profilesResult.error && isMissingColumnError(profilesResult.error, ['name', 'phone', 'status', 'barbershop_id', 'created_at', 'global_role'])) {
    profilesResult = await supabaseClient
      .from('profiles')
      .select('id, email, role')
      .order('id', { ascending: false })
  }

  if (profilesResult.error) {
    showFormFeedback(`Erro ao carregar aprovacoes: ${profilesResult.error.message}`, 'error', 'admin-user-approvals-feedback')
    renderManagementMessage('admin-user-approvals-list', `Erro ao carregar aprovacoes: ${profilesResult.error.message}`)
    return
  }

  const rawItems = Array.isArray(profilesResult.data) ? profilesResult.data : []
  adminPendingApprovalsCache = rawItems
    .map((item) => ({
      ...item,
      role: normalizePortalRole(item.role || CUSTOMER_ROLE),
      status: String(item.status || 'pending').trim().toLowerCase()
    }))
    .filter((item) => item.status === 'pending' && item.global_role !== 'super_admin')

  const barbershopIds = [...new Set(adminPendingApprovalsCache.map((item) => item.barbershop_id).filter(Boolean))]
  let barbershopNameById = new Map()

  if (barbershopIds.length) {
    const { data: barbershops } = await supabaseClient
      .from('barbershops')
      .select('id, name')
      .in('id', barbershopIds)

    barbershopNameById = new Map((barbershops || []).map((item) => [item.id, item.name]))
  }

  showFormFeedback('', 'info', 'admin-user-approvals-feedback')
  renderAdminUserApprovals(adminPendingApprovalsCache, barbershopNameById)
}

async function aplicarDecisaoDeAprovacaoAdmin(entry, nextStatus) {
  const currentUser = await ensureAdminAccess()
  if (!currentUser) {
    return { error: new Error('Acesso negado') }
  }

  const normalizedRole = normalizePortalRole(entry.role || CUSTOMER_ROLE)
  const needsBarbershopContext = normalizedRole === BARBER_ROLE || normalizedRole === ADMIN_ROLE

  if (needsBarbershopContext && !entry.barbershop_id) {
    return { error: new Error('O usuario precisa estar vinculado a uma barbearia antes da aprovacao.') }
  }

  let profileResult = await supabaseClient
    .from('profiles')
    .update({
      status: nextStatus,
      global_role: getGlobalRoleForPortalRole(entry.role, entry.global_role || '')
    })
    .eq('id', entry.id)

  if (profileResult.error && isMissingColumnError(profileResult.error, ['status', 'global_role'])) {
    profileResult = { error: null }
  }

  if (profileResult.error) {
    return { error: profileResult.error }
  }

  if (needsBarbershopContext && entry.barbershop_id) {
    const accessStatus = nextStatus === 'active' ? 'active' : 'blocked'
    const { data: accessData, error: accessError } = await invokeProtectedFunction('admin-update-user-access', {
      targetUserId: entry.id,
      barbershopId: entry.barbershop_id,
      role: normalizeAccessRole(normalizedRole),
      status: accessStatus
    }, {
      authErrorMessage: 'Sua sessao de administrador expirou. Faca login novamente para revisar aprovacoes.'
    })

    if (accessError) {
      return { error: accessError }
    }

    if (accessData?.error) {
      return { error: new Error(accessData.error) }
    }

    if (entry.email) {
      const accessResult = await supabaseClient
        .from('barber_access')
        .upsert([{
          email: entry.email,
          barbershop_id: entry.barbershop_id,
          approved_by_email: currentUser.email,
          approved_at: new Date().toISOString(),
          is_active: nextStatus === 'active'
        }], { onConflict: 'email' })

      if (accessResult.error) {
        return { error: accessResult.error }
      }
    }
  }

  addAdminAccessAuditEntry({
    action: nextStatus === 'active' ? 'Usuario aprovado' : 'Usuario rejeitado',
    target_email: entry.email,
    performed_by_email: currentUser.email,
    details: `Perfil: ${getApprovalRoleLabel(normalizedRole)}`
  })

  return { error: null }
}

window.aprovarUsuarioPendenteAdmin = async function (userId) {
  const entry = getAdminPendingApprovalEntry(userId)
  if (!entry) {
    showFormFeedback('Usuario pendente nao encontrado.', 'error', 'admin-user-approvals-feedback')
    return
  }

  showFormFeedback(`Aprovando ${entry.email || 'usuario'}...`, 'info', 'admin-user-approvals-feedback')
  const result = await aplicarDecisaoDeAprovacaoAdmin(entry, 'active')

  if (result.error) {
    showFormFeedback(`Erro ao aprovar usuario: ${result.error.message}`, 'error', 'admin-user-approvals-feedback')
    return
  }

  showFormFeedback('Usuario aprovado com sucesso. O acesso ao portal ja esta liberado.', 'success', 'admin-user-approvals-feedback')
  await carregarAprovacoesAdmin()
  await carregarAdminUsuarios()
  await carregarAdminAcessos()
}

window.rejeitarUsuarioPendenteAdmin = async function (userId) {
  const entry = getAdminPendingApprovalEntry(userId)
  if (!entry) {
    showFormFeedback('Usuario pendente nao encontrado.', 'error', 'admin-user-approvals-feedback')
    return
  }

  showFormFeedback(`Rejeitando ${entry.email || 'usuario'}...`, 'info', 'admin-user-approvals-feedback')
  const result = await aplicarDecisaoDeAprovacaoAdmin(entry, 'blocked')

  if (result.error) {
    showFormFeedback(`Erro ao rejeitar usuario: ${result.error.message}`, 'error', 'admin-user-approvals-feedback')
    return
  }

  showFormFeedback('Usuario rejeitado com sucesso.', 'success', 'admin-user-approvals-feedback')
  await carregarAprovacoesAdmin()
  await carregarAdminUsuarios()
  await carregarAdminAcessos()
}

// Carrega os emails autorizados para o portal do barbeiro no painel do admin.
async function carregarGestaoDeAcessos(barbershopId) {
  const card = document.getElementById('access-management-card')
  const currentUser = await getCurrentUser()

  updateApprovalsScreenLayout(false)

  if (!card) {
    return
  }

  if (!(isAdminEmail(currentUser?.email) || isCurrentSessionSuperAdmin() || isCurrentSessionBarberPortalUser())) {
    card.style.display = 'none'
    return
  }

  card.style.display = 'block'

  const { data, error } = await supabaseClient
    .from('barber_access')
    .select('email, approved_at, approved_by_email, is_active')
    .eq('barbershop_id', barbershopId)
    .eq('is_active', true)
    .order('email', { ascending: true })

  if (error) {
    renderAccessManagementMessage(`Erro ao carregar os acessos: ${error.message}`)
    return
  }

  const container = document.getElementById('approved-barbers-list')
  if (!container) {
    return
  }

  if (!data || data.length === 0) {
    renderAccessManagementMessage('Nenhum email autorizado ainda.')
    return
  }

  container.innerHTML = data
    .map((item) => `
      <div class="management-row">
        <div>
          <strong>${item.email}</strong>
          <span class="management-meta">Liberado por ${item.approved_by_email || ADMIN_EMAIL} em ${item.approved_at ? new Date(item.approved_at).toLocaleString() : '-'}</span>
        </div>
        <div class="management-actions">
          <button class="danger-action" type="button" onclick="revogarEmailBarbeiro('${item.email}')">Revogar</button>
        </div>
      </div>
    `)
    .join('')
}

// Autoriza manualmente um email para acessar o portal do barbeiro.
window.aprovarEmailBarbeiro = async function () {
  const currentUser = await getCurrentUser()
  if (!(isAdminEmail(currentUser?.email) || isCurrentSessionSuperAdmin() || isCurrentSessionBarberPortalUser())) {
    alert('Somente o admin pode liberar acesso ao portal do barbeiro.')
    return
  }

  const input = document.getElementById('approved-barber-email')
  const email = input?.value.trim().toLowerCase()
  const barbershopId = await getBarbershop()

  if (!email) {
    alert('Informe um email para autorizar.')
    return
  }

  if (!barbershopId) {
    alert('Nao foi possivel identificar a barbearia do admin.')
    return
  }

  const { error } = await supabaseClient
    .from('barber_access')
    .upsert(
      [
        {
          email,
          barbershop_id: barbershopId,
          approved_by_email: currentUser.email,
          approved_at: new Date().toISOString(),
          is_active: true
        }
      ],
      { onConflict: 'email' }
    )

  if (error) {
    alert(`Erro ao liberar email: ${error.message}`)
    return
  }

  if (input) {
    input.value = ''
  }

  await carregarGestaoDeAcessos(barbershopId)
}

// Revoga o acesso de um email ao portal do barbeiro.
window.revogarEmailBarbeiro = async function (email) {
  const currentUser = await getCurrentUser()
  if (!(isAdminEmail(currentUser?.email) || isCurrentSessionSuperAdmin() || isCurrentSessionBarberPortalUser())) {
    alert('Somente o admin pode revogar acessos.')
    return
  }

  if (!confirm(`Revogar o acesso do email ${email}?`)) {
    return
  }

  const { error } = await supabaseClient
    .from('barber_access')
    .update({ is_active: false })
    .eq('email', email)

  if (error) {
    alert(`Erro ao revogar acesso: ${error.message}`)
    return
  }

  const barbershopId = await getBarbershop()
  await carregarGestaoDeAcessos(barbershopId)
}

// Escolhe service_sales como fonte principal e usa appointments apenas como fallback.
function getServiceRevenueSource(serviceSalesResult, appointmentsResult) {
  if (!serviceSalesResult.error && Array.isArray(serviceSalesResult.items) && serviceSalesResult.items.length > 0) {
    return {
      items: serviceSalesResult.items,
      mode: 'service_sales',
      error: null
    }
  }

  if (!appointmentsResult.error) {
    return {
      items: appointmentsResult.items || [],
      mode: 'appointments',
      error: null
    }
  }

  return {
    items: [],
    mode: 'service_sales',
    error: serviceSalesResult.error || appointmentsResult.error
  }
}

// Detecta quando a tabela appointments ainda nao possui colunas de identidade do cliente.
function isMissingAppointmentIdentityColumnsError(error) {
  const message = error?.message || ''
  return message.includes('customer_user_id') || message.includes('customer_email')
}

// Detecta quando a tabela appointments ainda nao possui colunas para acompanhar finalizacao.
function isMissingAppointmentWorkflowColumnsError(error) {
  const message = error?.message || ''
  return message.includes('status') || message.includes('finalized_at')
}

// Escapa caracteres especiais usados nos filtros OR do Supabase/PostgREST.
function escapeSupabaseFilterValue(value) {
  return String(value || '').replace(/,/g, '\\,').replace(/\)/g, '\\)')
}

function escapeTemplateString(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
}

function isUuidValue(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim())
}

// Remove duplicidades caso o mesmo agendamento seja encontrado por id de usuario e email.
function deduplicateAppointments(items) {
  const byId = new Map()

  ;(items || []).forEach((item) => {
    if (!item?.id || byId.has(item.id)) {
      return
    }

    byId.set(item.id, item)
  })

  return Array.from(byId.values())
}

// Extrai o valor financeiro de um item de service_sales ou appointments.
function getServiceRevenueValue(item, mode) {
  if (mode === 'service_sales') {
    return Number(item.service_price || 0)
  }

  return Number(item.services?.price || 0)
}

// Soma o faturamento gerado pelos servicos registrados.
function sumServiceRevenue(items, mode) {
  return (items || []).reduce((total, item) => total + getServiceRevenueValue(item, mode), 0)
}

// Soma o valor das vendas de produtos registradas no caixa.
function sumProductSalesRevenue(items) {
  return (items || []).reduce((total, item) => total + Number(item.total_amount || 0), 0)
}

// Formata qualquer valor numerico em moeda brasileira.
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0))
}

// Remove um item administrativo da tabela escolhida.
window.deletarCadastro = async function (tableName, id) {
  if (!confirm('Tem certeza que deseja apagar este cadastro?')) {
    return
  }

  const { error } = await supabaseClient
    .from(tableName)
    .delete()
    .eq('id', id)

  if (error) {
    alert(`Erro ao apagar cadastro: ${error.message}`)
    return
  }

  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    return
  }

  if (tableName === 'barbers') {
    await carregarDados()
    await carregarBarbeirosAdmin(barbershopId)
  }

  if (tableName === 'services') {
    await carregarDados()
    await carregarServicosAdmin(barbershopId)
  }

  if (tableName === 'products') {
    await carregarProdutosAdmin(barbershopId)
  }

  if (tableName === 'customers') {
    await carregarClientesAdmin(barbershopId)
  }
}

// Atualiza o preco de um servico ou produto na tela de cadastros.
window.editarPrecoCadastro = async function (tableName, id, currentPrice) {
  const nextPrice = prompt('Informe o novo preco:', currentPrice ?? '')

  if (nextPrice === null) {
    return
  }

  const normalizedPrice = nextPrice.trim().replace(',', '.')

  if (!normalizedPrice || Number.isNaN(Number(normalizedPrice))) {
    alert('Informe um preco valido.')
    return
  }

  const { error } = await supabaseClient
    .from(tableName)
    .update({ price: Number(normalizedPrice) })
    .eq('id', id)

  if (error) {
    alert(`Erro ao editar preco: ${error.message}`)
    return
  }

  const barbershopId = await getBarbershop()
  if (!barbershopId) {
    return
  }

  if (tableName === 'services') {
    await carregarServicosAdmin(barbershopId)
    return
  }

  if (tableName === 'products') {
    await carregarProdutosAdmin(barbershopId)
  }
}

// Exibe uma mensagem simples nas listas administrativas.
function renderAdminMessage(containerId, message) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  container.innerHTML = `<div class="admin-empty">${message}</div>`
}

// Renderiza os itens das listas de cadastros.
function renderAdminItems(containerId, items, emptyMessage, tableName) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  if (!Array.isArray(items) || items.length === 0) {
    renderAdminMessage(containerId, emptyMessage)
    return
  }

  container.innerHTML = items
    .map((item) => {
      const label = item.label || item.name
      const meta = item.meta ? `<span class="admin-meta">${item.meta}</span>` : ''
      const canEditPrice = tableName === 'services' || tableName === 'products'
      const currentPrice = item.price != null ? Number(item.price).toFixed(2) : ''
      const editPriceButton = canEditPrice
        ? `<button class="edit-button" onclick="editarPrecoCadastro('${tableName}', '${item.id}', '${currentPrice}')">Editar preco</button>`
        : ''
      return `
        <div class="admin-item">
          <div>
            <strong>${label}</strong>
            ${meta}
          </div>
          <div class="admin-actions">
            ${editPriceButton}
            <button onclick="deletarCadastro('${tableName}', '${item.id}')">Apagar</button>
          </div>
        </div>
      `
    })
    .join('')
}

// Ativa ou desativa os controles protegidos quando o usuario faz login/logout.
function updateProtectedUi(isLoggedIn) {
  document.querySelectorAll('[data-protected="true"]').forEach((element) => {
    element.disabled = !isLoggedIn
  })

  const logoutButton = document.getElementById('nav-sair')
  if (logoutButton) {
    logoutButton.style.display = isLoggedIn ? 'inline-flex' : 'none'
  }

  updateTopbarUserIdentity()
  updatePortalNavigation()
}

// Monta o texto secundario exibido em servicos e produtos.
function buildMetaText(description, price) {
  const parts = []

  if (description) {
    parts.push(description)
  }

  if (price != null && price !== '') {
    parts.push(`R$ ${Number(price).toFixed(2)}`)
  }

  return parts.join(' | ')
}

// Seleciona o portal atual na tela inicial.
window.selecionarPortal = function (portal) {
  setPortal(portal)
  applyPortalUi()
}

// Limpa o portal selecionado e volta ao estado inicial do login.
window.limparPortalSelecionado = function () {
  currentPortal = null
  localStorage.removeItem(PORTAL_STORAGE_KEY)
  applyPortalUi()
}

// Atualiza os textos, botoes e navegacao conforme o portal escolhido.
function applyPortalUi() {
  updateLoginPortalUi()
  updatePortalNavigation()
  updateAdminContextUi()
  updateClientPublicViewUi()
  updateTopbarScreenContext(currentVisibleScreenId || getDefaultScreenForPortal())
  updatePortalLandingUi()
  syncMobileMenuUi()
}

// Persiste o portal para manter a experiencia apos recarregar.
function setPortal(portal) {
  currentPortal = portal
  if (portal) {
    localStorage.setItem(PORTAL_STORAGE_KEY, portal)
  }
}

// Restaura a escolha do portal salva no navegador.
function restorePortalSelection() {
  if (isAdminEntryPage()) {
    setPortal('admin')
    return
  }

  if (isSignupEntryPage()) {
    currentPortal = 'cliente'
    return
  }

  if (isClientEntryPage()) {
    currentPortal = 'cliente'
    return
  }

  if (isBarberEntryPage()) {
    currentPortal = 'barbeiro'
    return
  }

  const portalHint = getPortalHintFromUrl()
  if (portalHint) {
    currentPortal = portalHint
    return
  }

  currentPortal = currentBarbershopContext ? 'cliente' : null
}

// Atualiza a area de login com o portal selecionado.
function updateLoginPortalUi() {
  const loginKicker = document.getElementById('login-kicker')
  const selectedPortalLabel = document.getElementById('selected-portal-label')
  const loginTitle = document.getElementById('login-title')
  const loginDescription = document.getElementById('login-description')
  const portalEntryActions = document.getElementById('portal-entry-actions')
  const loginFormPanel = document.getElementById('login-form-panel')
  const loginModeChip = document.getElementById('login-mode-chip')
  const isPortalLanding = isMainPortalLanding()

  if (loginKicker) {
    loginKicker.textContent = isPortalLanding
      ? 'Portal'
      : isAdminEntryPage()
        ? 'Portal master'
        : isClientEntryPage()
          ? 'Portal cliente'
          : isBarberEntryPage()
            ? 'Portal barbearia'
        : isSignupEntryPage()
          ? 'Cadastro'
          : isClientPublicView()
            ? 'Agendamento'
            : 'Acesso'
  }

  if (portalEntryActions) {
    portalEntryActions.style.display = isPortalLanding ? 'grid' : 'none'
  }

  if (loginFormPanel) {
    loginFormPanel.style.display = isPortalLanding ? 'none' : 'block'
  }

  if (loginModeChip) {
    loginModeChip.style.display = isPortalLanding ? 'none' : 'flex'
  }

  if (selectedPortalLabel) {
    selectedPortalLabel.textContent = isPortalLanding
      ? ''
      : isAdminEntryPage()
      ? 'Acesso restrito ao administrador principal.'
      : isClientEntryPage()
        ? 'Portal do cliente com acesso a agendamentos e produtos.'
      : isBarberEntryPage()
        ? 'Portal da barbearia com acesso a gestao, agenda, cadastros e aprovacoes.'
      : isClientPublicView()
        ? `Agendamento direto para ${currentBarbershopContext?.name || 'esta barbearia'}.`
      : isSignupEntryPage()
        ? 'Seu cadastro sera criado no portal do cliente.'
        : currentPortal === BARBER_ROLE
          ? 'Entre com o email liberado pela barbearia para acessar o portal operacional.'
          : currentPortal === CUSTOMER_ROLE
            ? 'Entre como cliente para agendar, acompanhar historico e comprar produtos.'
        : 'Entre com seu email e o sistema identifica automaticamente seu portal.'
  }

  if (loginTitle) {
    loginTitle.textContent = isPortalLanding
      ? 'Entrar no portal'
      : isAdminEntryPage()
      ? 'Entrar no portal do administrador'
      : isClientEntryPage()
        ? 'Entrar no portal do cliente'
      : isBarberEntryPage()
        ? 'Entrar no portal da barbearia'
      : isClientPublicView()
        ? `Agende com ${currentBarbershopContext?.name || 'a barbearia'}`
        : currentPortal === BARBER_ROLE
          ? 'Entrar no portal da barbearia'
          : currentPortal === CUSTOMER_ROLE
            ? 'Entrar no portal do cliente'
      : 'Entrar na sua conta'
  }

  if (loginDescription) {
    loginDescription.textContent = isPortalLanding
      ? ''
      : isAdminEntryPage()
      ? 'Somente o email master autorizado pode acessar esta area.'
      : isClientEntryPage()
        ? 'Use seu email e senha para acessar somente agendamentos e produtos.'
      : isBarberEntryPage()
        ? 'Use seu email e senha para acessar gestao, agenda, cadastros e aprovacoes da sua barbearia.'
      : isClientPublicView()
        ? 'Escolha barbeiro, servicos e horario. O contexto da barbearia ja foi identificado pela URL.'
      : isSignupEntryPage()
        ? 'Crie sua conta de cliente e confirme seu email antes de entrar.'
        : currentPortal === BARBER_ROLE
          ? 'Use o email com acesso ativo ao portal da barbearia. O sistema validara sua unidade automaticamente.'
        : currentPortal === CUSTOMER_ROLE
            ? 'Use seu email e senha para acessar agendamentos, compras e historico como cliente.'
      : 'Use seu email e senha. O sistema redireciona automaticamente para cliente, barbearia ou administrador.'

    loginDescription.style.display = isPortalLanding ? 'none' : 'block'
  }
}

function updatePortalLandingUi() {
  const shouldUseLandingLayout = isMainPortalLanding() && currentVisibleScreenId === 'login'
  document.body.classList.toggle('portal-landing', shouldUseLandingLayout)
}

// Exibe apenas os botoes de menu permitidos para o portal atual.
function updatePortalNavigation() {
  document.querySelectorAll('.nav-button[data-portal]').forEach((button) => {
    const allowedPortals = (button.dataset.portal || '').split(',').map((item) => item.trim())
    const requiresAdmin = button.dataset.adminOnly === 'true'
    const shouldShow = isClientPublicView()
      ? false
      : currentPortal
      ? allowedPortals.includes(currentPortal) && (!requiresAdmin || isCurrentSessionSuperAdmin())
      : false
    button.style.display = shouldShow ? 'inline-flex' : 'none'
  })

  document.querySelectorAll('[data-nav-group]').forEach((group) => {
    const visibleButtons = Array.from(group.querySelectorAll('.nav-button[data-portal]'))
      .some((button) => button.style.display !== 'none')
    group.style.display = visibleButtons ? '' : 'none'
  })
}

// Define a tela inicial padrao do portal selecionado.
function getDefaultScreenForPortal() {
  if (currentPortal === 'barbeiro') {
    return 'agenda'
  }

  if (currentPortal === 'admin') {
    return 'admin-dashboard'
  }

  return 'agendar'
}

// Verifica se a tela faz parte das permissoes do portal.
function isScreenAllowedForPortal(screenId) {
  if (isClientPublicView()) {
    return screenId === 'agendar'
  }

  if (screenId === 'login') {
    return true
  }

  if (screenId === 'aprovacoes') {
    return currentPortal === 'admin'
      ? isCurrentSessionSuperAdmin()
      : currentPortal === 'barbeiro'
        ? (isCurrentSessionBarberPortalUser() || isCurrentSessionSuperAdmin())
        : false
  }

  const portalPermissions = {
    cliente: ['agendar', 'produtos'],
    barbeiro: ['gestao', 'agenda', 'cadastros'],
    admin: ['agendar', 'produtos', 'gestao', 'agenda', 'cadastros', 'admin-dashboard', 'admin-barbershops', 'admin-access', 'aprovacoes', 'admin-users']
  }

  return portalPermissions[currentPortal]?.includes(screenId) ?? false
}

// Dispara o carregamento dos dados necessarios para cada tela.
async function carregarPortalData(screenId) {
  if (screenId === 'agendar') {
    await carregarDados()
    if (currentPortal === 'cliente' && !isClientPublicView()) {
      await carregarHistoricoCliente()
    }
    return
  }

  if (screenId === 'agenda') {
    await carregarAgenda()
    return
  }

  if (screenId === 'cadastros') {
    await carregarCadastros()
    return
  }

  if (screenId === 'produtos') {
    await carregarProdutos()
    return
  }

  if (screenId === 'gestao') {
    await carregarGestao()
    return
  }

  if (screenId === 'admin-dashboard') {
    await carregarAdminDashboard()
    return
  }

  if (screenId === 'admin-barbershops') {
    await carregarAdminBarbearias()
    return
  }

  if (screenId === 'admin-access') {
    await carregarAdminAcessos()
    return
  }

  if (screenId === 'admin-users') {
    await carregarAdminUsuarios()
    return
  }

  if (screenId === 'aprovacoes') {
    if (currentPortal === 'admin') {
      await carregarAprovacoesAdmin()
      return
    }

    const barbershopId = await getBarbershop()

    if (!barbershopId) {
      renderAccessManagementMessage(getTenantPortalMessage('Faca login como admin para gerenciar os acessos do portal da barbearia.'))
      return
    }

    await carregarGestaoDeAcessos(barbershopId)
  }
}

// Alterna entre o tema gelo claro e gelo dark.
window.toggleTheme = function () {
  const isDarkMode = document.body.classList.toggle('dark-mode')
  const nextTheme = isDarkMode ? 'dark' : 'light'

  localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
  updateThemeToggleLabel(isDarkMode)
}

// Aplica o tema salvo no navegador ao iniciar a pagina.
function applySavedTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  const isDarkMode = savedTheme === 'dark'

  document.body.classList.toggle('dark-mode', isDarkMode)
  updateThemeToggleLabel(isDarkMode)
}

// Atualiza o texto do botao de tema.
function updateThemeToggleLabel(isDarkMode) {
  const toggleButton = document.getElementById('theme-toggle')

  if (!toggleButton) {
    return
  }

  toggleButton.textContent = isDarkMode ? 'Light' : 'Dark'
}

window.addEventListener('resize', () => {
  if (!shouldUseMobileMenu()) {
    isMobileMenuOpen = false
  }
  syncMobileMenuUi()
})

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMobileMenu()
  }
})

function warnIfRunningFromFileProtocol() {
  if (window.location.protocol !== 'file:') {
    return false
  }

  const targetFile = isAdminEntryPage()
    ? 'admin.html'
    : isSignupEntryPage()
      ? 'signup.html'
      : 'index.html'
  const localhostUrl = `http://localhost:5500/${targetFile}`

  window.setTimeout(() => {
    window.location.href = localhostUrl
  }, 250)

  document.body.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(180deg,#0d1829,#050b15);color:#f4f7fb;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="width:min(100%,560px);padding:28px;border:1px solid rgba(238,198,120,0.26);border-radius:24px;background:rgba(12,19,33,0.92);box-shadow:0 30px 80px rgba(0,0,0,0.45);">
        <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#97a9c3;font-weight:700;margin-bottom:10px;">Ambiente invalido</div>
        <h1 style="margin:0 0 12px;font-size:34px;line-height:1.05;">Redirecionando para localhost</h1>
        <p style="margin:0 0 16px;color:#d0d9e8;line-height:1.6;">Este sistema nao funciona corretamente em <strong>file://</strong>. O navegador bloqueia storage, refresh token e autenticacao do Supabase nesse modo.</p>
        <div style="padding:14px 16px;border-radius:16px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);font-family:Consolas,monospace;color:#f7efe0;">${localhostUrl}</div>
        <p style="margin:16px 0 0;color:#97a9c3;line-height:1.6;">Se o servidor ainda nao estiver no ar, rode: <strong>npm start</strong></p>
      </div>
    </div>
  `
  return true
}

// Abre ou fecha o seletor customizado de servicos.
window.toggleServicePicker = function () {
  const picker = document.getElementById('service-picker')
  const options = document.getElementById('service-options')
  const trigger = document.getElementById('service-trigger')

  if (!picker || !options || !trigger) {
    return
  }

  const isOpen = picker.classList.toggle('open')
  options.style.display = isOpen ? 'grid' : 'none'
  trigger.setAttribute('aria-expanded', String(isOpen))
}

// Atualiza o texto visivel do seletor de servicos.
window.updateServiceTriggerLabel = function (fallbackMessage = 'Selecione os servicos') {
  const trigger = document.getElementById('service-trigger')

  if (!trigger) {
    return
  }

  const selectedLabels = Array.from(
    document.querySelectorAll('#service-options input[type="checkbox"]:checked')
  ).map((input) => input.parentElement?.querySelector('span')?.textContent?.trim())
    .filter(Boolean)

  if (selectedLabels.length === 0) {
    trigger.textContent = fallbackMessage
    return
  }

  if (selectedLabels.length === 1) {
    trigger.textContent = selectedLabels[0]
    return
  }

  trigger.textContent = `${selectedLabels.length} servicos selecionados`
}

// Fecha o seletor de servicos ao clicar fora dele.
document.addEventListener('click', (event) => {
  const picker = document.getElementById('service-picker')
  const options = document.getElementById('service-options')
  const trigger = document.getElementById('service-trigger')

  if (!picker || !options || !trigger) {
    return
  }

  if (picker.contains(event.target)) {
    return
  }

  picker.classList.remove('open')
  options.style.display = 'none'
  trigger.setAttribute('aria-expanded', 'false')
})

document.addEventListener('DOMContentLoaded', init)

window.onAdminBarbershopContextChange = async function () {
  const select = document.getElementById('admin-active-barbershop')
  const selectedBarbershopId = select?.value || ''

  setAdminBarbershopContext(selectedBarbershopId || null)

  if (currentPortal === 'admin' && currentSession?.user && selectedBarbershopId && !window.location.pathname.toLowerCase().includes('admin.html')) {
    showScreen('gestao')
    await carregarPortalData('gestao')
  }
}

window.limparContextoAdmin = async function () {
  setAdminBarbershopContext(null)

  if (currentPortal === 'admin' && currentSession?.user) {
    showScreen('admin-dashboard')
    await carregarPortalData('admin-dashboard')
  }
}

window.selecionarContextoAdminDaBarbearia = async function (barbershopId) {
  if (!barbershopId) {
    return
  }

  setAdminBarbershopContext(barbershopId)
  showScreen('gestao')
  await carregarPortalData('gestao')
}

async function ensureAdminAccess() {
  const currentUser = await getCurrentUser()
  if (!currentUser?.email) {
    alert('Faca login novamente para acessar essa area.')
    return null
  }

  const context = await fetchPlatformContext()
  if (canAccessAdminPortal(currentUser, context)) {
    const accessResult = await validateAdminPortalAccess(currentUser)
    if (!accessResult.allowed) {
      alert(accessResult.message)
      return null
    }

    return currentUser
  }

  alert('Somente o administrador principal pode acessar essa area.')
  return null
}

function resetAdminBarbershopEditor() {
  adminEditingBarbershopId = null

  const fields = {
    'admin-edit-barbershop-id': '',
    'admin-edit-barbershop-name': '',
    'admin-edit-barbershop-phone': '',
    'admin-edit-barbershop-email': '',
    'admin-edit-barbershop-slug': '',
    'admin-edit-barbershop-logo-url': '',
    'admin-edit-barbershop-primary-color': '#ffffff',
    'admin-edit-barbershop-secondary-color': '#000000',
    'admin-edit-barbershop-plan': 'free'
  }

  Object.entries(fields).forEach(([fieldId, value]) => {
    const element = document.getElementById(fieldId)
    if (element) {
      element.value = value
    }
  })

  showFormFeedback('', 'info', 'admin-barbershop-edit-feedback')
}

function fillAdminBarbershopEditor(barbershop, subscription = null) {
  adminEditingBarbershopId = barbershop?.id || null

  const values = {
    'admin-edit-barbershop-id': barbershop?.id || '',
    'admin-edit-barbershop-name': barbershop?.name || '',
    'admin-edit-barbershop-phone': barbershop?.phone || '',
    'admin-edit-barbershop-email': barbershop?.email || '',
    'admin-edit-barbershop-slug': barbershop?.slug || '',
    'admin-edit-barbershop-logo-url': barbershop?.logo_url || '',
    'admin-edit-barbershop-primary-color': barbershop?.primary_color || '#ffffff',
    'admin-edit-barbershop-secondary-color': barbershop?.secondary_color || '#000000',
    'admin-edit-barbershop-plan': normalizePlanCode(subscription?.plan_code || 'free')
  }

  Object.entries(values).forEach(([fieldId, value]) => {
    const element = document.getElementById(fieldId)
    if (element) {
      element.value = value
    }
  })

  showFormFeedback(`Editando a barbearia ${barbershop?.name || ''}.`, 'info', 'admin-barbershop-edit-feedback')
}

window.cancelarEdicaoBarbeariaAdmin = function () {
  resetAdminBarbershopEditor()
}

window.editarBarbeariaAdmin = async function (barbershopId) {
  const currentUser = await ensureAdminAccess()
  if (!currentUser || !barbershopId) {
    return
  }

  showFormFeedback('Carregando dados da barbearia...', 'info', 'admin-barbershop-edit-feedback')

  const [{ data: barbershop, error }, subscriptionResult] = await Promise.all([
    supabaseClient
      .from('barbershops')
      .select('id, name, phone, email, slug, logo_url, primary_color, secondary_color')
      .eq('id', barbershopId)
      .maybeSingle(),
    fetchSaasSubscription(barbershopId)
  ])

  if (error || !barbershop) {
    showFormFeedback(`Erro ao carregar barbearia: ${error?.message || 'registro nao encontrado.'}`, 'error', 'admin-barbershop-edit-feedback')
    return
  }

  if (subscriptionResult.error) {
    showFormFeedback(`Barbearia carregada, mas houve erro ao consultar o plano: ${subscriptionResult.error.message}`, 'error', 'admin-barbershop-edit-feedback')
  }

  fillAdminBarbershopEditor(barbershop, subscriptionResult.data || null)
  document.getElementById('admin-edit-barbershop-name')?.focus()
}

window.salvarBarbeariaAdmin = async function () {
  const currentUser = await ensureAdminAccess()
  if (!currentUser) {
    return
  }

  const barbershopId = adminEditingBarbershopId || document.getElementById('admin-edit-barbershop-id')?.value || ''
  const name = document.getElementById('admin-edit-barbershop-name')?.value.trim() || ''
  const phone = document.getElementById('admin-edit-barbershop-phone')?.value.trim() || ''
  const email = document.getElementById('admin-edit-barbershop-email')?.value.trim().toLowerCase() || ''
  const slug = normalizeBarbershopSlugInput(document.getElementById('admin-edit-barbershop-slug')?.value || '')
  const logoUrl = document.getElementById('admin-edit-barbershop-logo-url')?.value.trim() || ''
  const primaryColor = document.getElementById('admin-edit-barbershop-primary-color')?.value || '#ffffff'
  const secondaryColor = document.getElementById('admin-edit-barbershop-secondary-color')?.value || '#000000'
  const planCode = normalizePlanCode(document.getElementById('admin-edit-barbershop-plan')?.value || 'free')

  if (!barbershopId) {
    showFormFeedback('Selecione uma barbearia para editar.', 'error', 'admin-barbershop-edit-feedback')
    return
  }

  if (!name) {
    showFormFeedback('Informe o nome da barbearia.', 'error', 'admin-barbershop-edit-feedback')
    return
  }

  showFormFeedback('Salvando alteracoes da barbearia...', 'info', 'admin-barbershop-edit-feedback')

  const updatePayload = {
    name,
    phone: phone || null,
    email: email || null,
    slug: slug || null,
    logo_url: logoUrl || null,
    primary_color: primaryColor || '#ffffff',
    secondary_color: secondaryColor || '#000000'
  }

  const { data: updatedBarbershop, error } = await supabaseClient
    .from('barbershops')
    .update(updatePayload)
    .eq('id', barbershopId)
    .select('id, name, phone, email, slug, logo_url, primary_color, secondary_color')
    .maybeSingle()

  if (error) {
    if (isConflictError(error)) {
      showFormFeedback(getBarbershopConflictMessage(error), 'error', 'admin-barbershop-edit-feedback')
      return
    }

    showFormFeedback(`Erro ao atualizar barbearia: ${error.message}`, 'error', 'admin-barbershop-edit-feedback')
    return
  }

  const subscriptionResult = await saveSaasSubscriptionPlan(barbershopId, planCode)
  if (subscriptionResult.error) {
    showFormFeedback(`Barbearia salva, mas houve erro ao atualizar o plano: ${subscriptionResult.error.message}`, 'error', 'admin-barbershop-edit-feedback')
  } else {
    showFormFeedback('Informacoes da barbearia atualizadas com sucesso.', 'success', 'admin-barbershop-edit-feedback')
  }

  fillAdminBarbershopEditor(updatedBarbershop || updatePayload, subscriptionResult.data || { plan_code: planCode })
  await carregarAdminBarbearias()
  await carregarAdminDashboard()
  await carregarAdminAcessos()
}

window.criarBarbeariaAdmin = async function () {
  const currentUser = await ensureAdminAccess()
  if (!currentUser) {
    return
  }

  const nameInput = document.getElementById('admin-new-barbershop-name')
  const phoneInput = document.getElementById('admin-new-barbershop-phone')
  const emailInput = document.getElementById('admin-new-barbershop-email')
  const ownerEmailInput = document.getElementById('admin-new-owner-email')
  const ownerPasswordInput = document.getElementById('admin-new-owner-password')
  const planInput = document.getElementById('admin-new-barbershop-plan')
  const name = nameInput?.value.trim()
  const phone = phoneInput?.value.trim() || ''
  const email = emailInput?.value.trim().toLowerCase() || ''
  const ownerEmail = ownerEmailInput?.value.trim().toLowerCase()
  const ownerPassword = ownerPasswordInput?.value || ''
  const planCode = normalizePlanCode(planInput?.value || 'free')

  if (!name) {
    alert('Informe o nome da barbearia.')
    return
  }

  if (!ownerEmail) {
    alert('Informe o email do responsavel.')
    return
  }

  if (!ownerPassword) {
    alert('Informe a senha inicial do responsavel.')
    return
  }

  if (ownerPassword.length < 6) {
    alert('A senha inicial deve ter pelo menos 6 caracteres.')
    return
  }

  const insertPayload = {
    name,
    phone,
    email,
    ownerEmail,
    ownerPassword,
    planCode
  }

  const { data: createdBarbershop, error: barbershopError } = await createAdminBarbershopProvision(insertPayload)

  if (barbershopError) {
    if (isConflictError(barbershopError)) {
      alert(getBarbershopConflictMessage(barbershopError))
      return
    }

    alert(`Erro ao criar barbearia: ${barbershopError.message}`)
    return
  }

  if (!createdBarbershop?.id) {
    alert('A barbearia foi criada, mas o ID nao retornou. Verifique se a tabela barbershops possui a coluna id.')
    return
  }

  try {
    await criarDadosIniciaisDaBarbearia(createdBarbershop.id)
  } catch (seedError) {
    console.error('Erro ao criar dados iniciais da nova barbearia', seedError)
  }

  const subscriptionResult = await ensureSaasSubscription(createdBarbershop.id, planCode)
  if (subscriptionResult.error) {
    console.error('Erro ao vincular plano SaaS', subscriptionResult.error)
    alert(`Barbearia criada, mas o plano nao foi salvo: ${subscriptionResult.error.message}`)
  }

  if (nameInput) {
    nameInput.value = ''
  }

  if (phoneInput) {
    phoneInput.value = ''
  }

  if (emailInput) {
    emailInput.value = ''
  }

  if (ownerEmailInput) {
    ownerEmailInput.value = ''
  }

  if (ownerPasswordInput) {
    ownerPasswordInput.value = ''
  }

  if (planInput) {
    planInput.value = 'free'
  }

  alert('Barbearia criada com sucesso.')
  await carregarAdminBarbearias()
  await carregarAdminDashboard()
  await carregarAdminAcessos()
}

async function carregarAdminDashboard() {
  const currentUser = await ensureAdminAccess()
  if (!currentUser) {
    return
  }

  let profilesResult

  const [
    barbershopsResult,
    appointmentsResult,
    barberAccessResult,
    serviceSalesResult,
    productSalesResult,
    subscriptionsResult
  ] = await Promise.all([
    supabaseClient.from('barbershops').select('id, name, owner_id, phone, email'),
    fetchAdminAppointmentsSummary(),
    supabaseClient.from('barber_access').select('email, is_active').then((result) => normalizeMissingTableResult(result, 'barber_access')),
    supabaseClient.from('service_sales').select('barbershop_id, service_price, barbershops(name)').then((result) => normalizeMissingTableResult(result, 'service_sales')),
    supabaseClient.from('product_sales').select('barbershop_id, total_amount, barbershops(name)').then((result) => normalizeMissingTableResult(result, 'product_sales')),
    fetchAdminSubscriptionsSummary()
  ])

  profilesResult = await supabaseClient.from('profiles').select('id, role')
  if (profilesResult.error && isMissingColumnError(profilesResult.error, ['role'])) {
    profilesResult = await supabaseClient.from('profiles').select('id')
  }

  renderAdminSummary(
    barbershopsResult.data || [],
    profilesResult.data || [],
    barberAccessResult.data || [],
    appointmentsResult.data || [],
    serviceSalesResult.data || [],
    productSalesResult.data || [],
    productSalesResult.error,
    subscriptionsResult.data || [],
    subscriptionsResult.error
  )

  updateAdminContextUi(barbershopsResult.data || [])
  renderAdminBarbershopsOverview(barbershopsResult.data || [], serviceSalesResult.data || [], productSalesResult.data || [], subscriptionsResult.data || [])
  renderAdminPlansDistribution(subscriptionsResult.data || [], subscriptionsResult.error)
  renderAdminAppointments(appointmentsResult.data || [])
}

async function carregarAdminBarbearias() {
  const currentUser = await ensureAdminAccess()
  if (!currentUser) {
    return
  }

  const { data, error } = await supabaseClient
    .from('barbershops')
    .select(`
      id,
      name,
      owner_id,
      phone,
      email,
      slug
    `)
    .order('name', { ascending: true })

  if (error) {
    renderManagementMessage('admin-barbershops-list', `Erro ao carregar barbearias: ${error.message}`)
    return
  }

  const subscriptionsResult = await fetchAdminSubscriptionsSummary()
  const normalizedSubscriptions = subscriptionsResult.data || []

  if (!adminEditingBarbershopId) {
    resetAdminBarbershopEditor()
  }

  updateAdminContextUi(data || [])
  renderAdminBarbershopsList(data || [], normalizedSubscriptions)
}

async function carregarAdminAcessos() {
  const currentUser = await ensureAdminAccess()
  if (!currentUser) {
    return
  }

  setAdminAccessLoading(true)

  const [profilesResult, userAccessResult, barberAccessResult, barbershopsResult, appointmentsResult, auditLogsResult] = await Promise.all([
    fetchProfilesForAdminAccess(),
    fetchUserAccessForAdminAccess(),
    supabaseClient
      .from('barber_access')
      .select('email, approved_at, approved_by_email, is_active, barbershop_id')
      .order('approved_at', { ascending: false })
      .then((result) => normalizeMissingTableResult(result, 'barber_access')),
    fetchBarbershopsForAdminAccess(),
    supabaseClient
      .from('appointments')
      .select('id, barbershop_id, appointment_time')
      .order('appointment_time', { ascending: false })
      .then((result) => normalizeMissingTableResult(result, 'appointments')),
    fetchAdminAccessAuditLogs()
  ])

  if (profilesResult.error) {
    setAdminAccessLoading(false)
    renderManagementMessage('admin-access-list', `Erro ao carregar acessos: ${profilesResult.error.message}`)
    return
  }

  if (userAccessResult.error && !userAccessResult.missingTable) {
    setAdminAccessLoading(false)
    renderManagementMessage('admin-access-list', `Erro ao carregar acessos: ${userAccessResult.error.message}`)
    return
  }

  if (barberAccessResult.error && !barberAccessResult.missingTable) {
    setAdminAccessLoading(false)
    renderManagementMessage('admin-access-list', `Erro ao carregar acessos: ${barberAccessResult.error.message}`)
    return
  }

  const directory = buildAdminAccessDirectory(
    profilesResult.data || [],
    userAccessResult.data || [],
    barberAccessResult.data || [],
    barbershopsResult.data || []
  )

  adminAccessDirectoryCache = directory
  adminAccessAuditCache = auditLogsResult.data || []
  adminContextStatsCache = buildAdminContextStats(directory, appointmentsResult.data || [])

  updateAdminContextUi(barbershopsResult.data || [])
  populateAdminAccessFilters(barbershopsResult.data || [])
  renderAdminAccessKpis(directory)
  filtrarAdminAcessos()
  renderAdminAccessAuditLog()
  setAdminAccessLoading(false)
}

async function fetchProfilesForAdminAccess() {
  let result = await supabaseClient
    .from('profiles')
    .select('id, email, role, global_role, name, phone, barbershop_id, status, last_login_at, created_at')
    .order('email', { ascending: true })

  if (result.error && isMissingColumnError(result.error, ['global_role', 'status', 'last_login_at', 'created_at'])) {
    result = await supabaseClient
      .from('profiles')
      .select('id, email, role, name, phone, barbershop_id')
      .order('email', { ascending: true })
  }

  return result
}

async function fetchUserAccessForAdminAccess() {
  let result = await supabaseClient
    .from('user_access')
    .select('user_id, barbershop_id, role, status, approved_by, approved_at, created_at')
    .then((response) => normalizeMissingTableResult(response, 'user_access'))

  if (result.error && isMissingColumnError(result.error, ['approved_at', 'created_at'])) {
    result = await supabaseClient
      .from('user_access')
      .select('user_id, barbershop_id, role, status, approved_by')
      .then((response) => normalizeMissingTableResult(response, 'user_access'))
  }

  return result
}

async function fetchBarbershopsForAdminAccess() {
  let result = await supabaseClient
    .from('barbershops')
    .select('id, name, location')
    .order('name', { ascending: true })

  if (result.error && isMissingColumnError(result.error, ['location'])) {
    result = await supabaseClient
      .from('barbershops')
      .select('id, name')
      .order('name', { ascending: true })
  }

  return result
}

async function fetchAdminAccessAuditLogs() {
  const result = await supabaseClient
    .from('access_audit_logs')
    .select('action, target_email, performed_by_email, created_at, details')
    .order('created_at', { ascending: false })
    .limit(10)

  if (result.error && isMissingTableError(result.error, 'access_audit_logs')) {
    return { data: adminAccessAuditCache || [], error: null, missingTable: true }
  }

  return result
}

function buildAdminAccessDirectory(profiles, userAccess, barberAccess, barbershops) {
  const byEmail = new Map()
  const profilesById = new Map()
  const barbershopMap = new Map((barbershops || []).map((item) => [item.id, item]))

  ;(profiles || []).forEach((profile) => {
    if (profile?.id) {
      profilesById.set(profile.id, profile)
    }

    const emailKey = String(profile.email || profile.id || '').trim().toLowerCase()
    if (!emailKey) {
      return
    }

    const explicitStatus = String(profile.status || '').trim().toLowerCase()
    byEmail.set(emailKey, {
      accessKey: emailKey,
      id: profile.id || emailKey,
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || '',
      global_role: profile.global_role || '',
      role: normalizePortalRole(profile.role || CUSTOMER_ROLE),
      accessRole: normalizeAccessRole(profile.role || CUSTOMER_ROLE),
      profileStatus: explicitStatus,
      status: explicitStatus === 'blocked' ? 'blocked' : explicitStatus === 'pending' ? 'pending' : 'active',
      barbershop_id: profile.barbershop_id || null,
      barbershop_name: profile.barbershop_id ? (barbershopMap.get(profile.barbershop_id)?.name || profile.barbershop_id) : 'Sem barbearia',
      barbershop_location: profile.barbershop_id ? (barbershopMap.get(profile.barbershop_id)?.location || '') : '',
      approved_by_email: normalizePortalRole(profile.role) === ADMIN_ROLE ? ADMIN_EMAIL : '',
      approved_at: profile.created_at || '',
      created_at: profile.created_at || '',
      last_login_at: profile.last_login_at || '',
      source: 'profile'
    })
  })

  ;(userAccess || []).forEach((access) => {
    const profile = profilesById.get(access.user_id)
    const emailKey = String(profile?.email || access.user_id || '').trim().toLowerCase()
    if (!emailKey) {
      return
    }

    const existing = byEmail.get(emailKey)
    const barbershopId = access.barbershop_id || existing?.barbershop_id || profile?.barbershop_id || null
    const barbershop = barbershopId ? barbershopMap.get(barbershopId) : null
    const normalizedRole = normalizePortalRole(access.role || existing?.role || profile?.role)

    byEmail.set(emailKey, {
      accessKey: emailKey,
      id: profile?.id || existing?.id || access.user_id || emailKey,
      name: existing?.name || profile?.name || '',
      email: profile?.email || existing?.email || '',
      phone: existing?.phone || profile?.phone || '',
      global_role: existing?.global_role || profile?.global_role || '',
      role: normalizedRole,
      accessRole: normalizeAccessRole(access.role || normalizedRole),
      profileStatus: existing?.profileStatus || String(profile?.status || '').trim().toLowerCase(),
      status: access.status || existing?.status || 'active',
      barbershop_id: barbershopId,
      barbershop_name: barbershop?.name || existing?.barbershop_name || 'Sem barbearia',
      barbershop_location: barbershop?.location || existing?.barbershop_location || '',
      approved_by_email: existing?.approved_by_email || '',
      approved_at: access.approved_at || existing?.approved_at || '',
      created_at: access.created_at || existing?.created_at || profile?.created_at || '',
      last_login_at: existing?.last_login_at || profile?.last_login_at || '',
      source: existing?.source ? `${existing.source}+user_access` : 'user_access'
    })
  })

  ;(barberAccess || []).forEach((access) => {
    const emailKey = String(access.email || '').trim().toLowerCase()
    if (!emailKey) {
      return
    }

    const existing = byEmail.get(emailKey)
    const hasProfile = Boolean(existing?.id)
    const status = access.is_active ? (hasProfile ? (existing?.status === 'blocked' ? 'blocked' : 'active') : 'pending') : 'blocked'
    const barbershopId = existing?.barbershop_id || access.barbershop_id || null
    const barbershop = barbershopId ? barbershopMap.get(barbershopId) : null

    byEmail.set(emailKey, {
      accessKey: emailKey,
      id: existing?.id || emailKey,
      name: existing?.name || '',
      email: access.email,
      phone: existing?.phone || '',
      global_role: existing?.global_role || '',
      role: normalizePortalRole(existing?.role || BARBER_ROLE),
      accessRole: normalizeAccessRole(existing?.accessRole || existing?.role || BARBER_ROLE),
      profileStatus: existing?.profileStatus || '',
      status,
      barbershop_id: barbershopId,
      barbershop_name: barbershop?.name || existing?.barbershop_name || 'Sem barbearia',
      barbershop_location: barbershop?.location || existing?.barbershop_location || '',
      approved_by_email: access.approved_by_email || existing?.approved_by_email || ADMIN_EMAIL,
      approved_at: access.approved_at || existing?.approved_at || '',
      created_at: access.approved_at || existing?.created_at || '',
      last_login_at: existing?.last_login_at || '',
      source: existing ? 'profile+access' : 'barber_access'
    })
  })

  if (!byEmail.has(ADMIN_EMAIL)) {
    byEmail.set(ADMIN_EMAIL, {
      accessKey: ADMIN_EMAIL,
      id: ADMIN_EMAIL,
      name: 'Administrador principal',
      email: ADMIN_EMAIL,
      phone: '',
      global_role: 'super_admin',
      role: ADMIN_ROLE,
      accessRole: 'admin',
      status: 'active',
      barbershop_id: null,
      barbershop_name: 'Operacao global',
      barbershop_location: '',
      approved_by_email: ADMIN_EMAIL,
      approved_at: '',
      created_at: '',
      last_login_at: '',
      source: 'system'
    })
  }

  return Array.from(byEmail.values())
    .filter((item) => item.source !== 'barber_access')
    .sort((a, b) => {
    const shopDiff = String(a.barbershop_name || '').localeCompare(String(b.barbershop_name || ''))
    if (shopDiff !== 0) {
      return shopDiff
    }

    return String(a.email || '').localeCompare(String(b.email || ''))
  })
}

function buildAdminContextStats(directory, appointments) {
  const usersByBarbershop = new Map()
  const appointmentsByBarbershop = new Map()

  ;(directory || []).forEach((item) => {
    if (!item.barbershop_id) {
      return
    }

    usersByBarbershop.set(item.barbershop_id, (usersByBarbershop.get(item.barbershop_id) || 0) + 1)
  })

  ;(appointments || []).forEach((item) => {
    if (!item.barbershop_id) {
      return
    }

    appointmentsByBarbershop.set(item.barbershop_id, (appointmentsByBarbershop.get(item.barbershop_id) || 0) + 1)
  })

  return {
    usersByBarbershop,
    appointmentsByBarbershop
  }
}

function populateAdminAccessFilters(barbershops) {
  const filter = document.getElementById('admin-access-barbershop-filter')
  const editorBarbershop = document.getElementById('admin-access-editor-barbershop')
  const currentFilterValue = filter?.value || ''
  const currentEditorValue = editorBarbershop?.value || ''

  if (filter) {
    filter.innerHTML = ['<option value="">Todas as barbearias</option>']
      .concat((barbershops || []).map((item) => `<option value="${item.id}">${item.name}</option>`))
      .join('')
    filter.value = currentFilterValue
  }

  if (editorBarbershop) {
    editorBarbershop.innerHTML = ['<option value="">Sem barbearia</option>']
      .concat((barbershops || []).map((item) => `<option value="${item.id}">${item.name}</option>`))
      .join('')
    editorBarbershop.value = currentEditorValue
  }

  const newBarbershop = document.getElementById('admin-access-new-barbershop')
  const currentNewValue = newBarbershop?.value || ''
  if (newBarbershop) {
    newBarbershop.innerHTML = ['<option value="">Selecione a barbearia</option>']
      .concat((barbershops || []).map((item) => `<option value="${item.id}">${item.name}</option>`))
      .join('')
    newBarbershop.value = currentNewValue
  }
}

window.handleAdminAccessPortalChange = function () {
  const portal = document.getElementById('admin-access-new-portal')?.value
  const newBarbershop = document.getElementById('admin-access-new-barbershop')

  if (!newBarbershop) {
    return
  }

  if (portal === BARBER_ROLE) {
    newBarbershop.style.display = 'block'
  } else {
    newBarbershop.style.display = 'none'
    newBarbershop.value = ''
  }
}

function renderAdminAccessKpis(items = []) {
  const container = document.getElementById('admin-access-kpis')
  if (!container) {
    return
  }

  const activeUsers = items.filter((item) => item.status === 'active').length
  const blockedUsers = items.filter((item) => item.status === 'blocked').length
  const pendingUsers = items.filter((item) => item.status === 'pending').length
  const totalBarbershops = new Set(items.map((item) => item.barbershop_id).filter(Boolean)).size

  container.innerHTML = [
    { label: 'Usuarios ativos', value: String(activeUsers) },
    { label: 'Barbearias', value: String(totalBarbershops) },
    { label: 'Solicitacoes pendentes', value: String(pendingUsers) },
    { label: 'Usuarios bloqueados', value: String(blockedUsers) }
  ].map((card) => `
    <article class="metric-card">
      <span class="metric-label">${card.label}</span>
      <strong class="metric-value">${card.value}</strong>
    </article>
  `).join('')
}

function renderAdminAccessAuditLog() {
  const container = document.getElementById('admin-access-audit-log')
  if (!container) {
    return
  }

  if (!adminAccessAuditCache.length) {
    renderManagementMessage('admin-access-audit-log', 'Nenhuma atividade de seguranca registrada ainda.')
    return
  }

  container.innerHTML = adminAccessAuditCache
    .slice(0, 10)
    .map((item) => `
      <div class="management-row">
        <div>
          <strong>${item.action || 'Atualizacao de acesso'}</strong>
          <span class="management-meta">${item.target_email || '-'} | por ${item.performed_by_email || ADMIN_EMAIL} | ${formatAdminDate(item.created_at)}</span>
        </div>
        <span class="management-badge">${item.details || 'Auditoria'}</span>
      </div>
    `)
    .join('')
}

window.criarAcessoAdmin = async function () {
  const currentUser = await ensureAdminAccess()
  if (!currentUser) {
    return
  }

  const emailInput = document.getElementById('admin-access-new-email')
  const portalSelect = document.getElementById('admin-access-new-portal')
  const statusSelect = document.getElementById('admin-access-new-status')
  const barbershopSelect = document.getElementById('admin-access-new-barbershop')
  const feedbackId = 'admin-access-new-feedback'

  const email = emailInput?.value.trim().toLowerCase() || ''
  const portal = portalSelect?.value || CUSTOMER_ROLE
  const status = statusSelect?.value || 'active'
  const barbershopId = barbershopSelect?.value || ''

  if (!email) {
    showFormFeedback('Informe o email do usuario.', 'error', feedbackId)
    return
  }

  if (portal === BARBER_ROLE && !barbershopId) {
    showFormFeedback('Selecione a barbearia para o acesso do portal.', 'error', feedbackId)
    return
  }

  showFormFeedback('Registrando acesso...', 'info', feedbackId)

  const profileResult = await supabaseClient
    .from('profiles')
    .select('id, role, status, global_role')
    .eq('email', email)
    .maybeSingle()

  if (profileResult.error) {
    showFormFeedback(`Erro ao buscar perfil: ${profileResult.error.message}`, 'error', feedbackId)
    return
  }

  const profileId = profileResult.data?.id || null

  if (portal !== BARBER_ROLE && !profileId) {
    showFormFeedback('Email sem perfil cadastrado. Crie primeiro o usuario no portal de usuarios.', 'error', feedbackId)
    return
  }

  const normalizedPortal = normalizePortalRole(portal)
  const normalizedAccessRole = normalizeAccessRole(normalizedPortal)
  const signaledStatus = status === 'blocked' ? 'blocked' : status === 'pending' ? 'pending' : 'active'

  try {
    if (normalizedPortal === BARBER_ROLE) {
      const { error } = await supabaseClient
        .from('barber_access')
        .upsert([{
          email,
          barbershop_id: barbershopId,
          approved_by_email: currentUser.email,
          approved_at: new Date().toISOString(),
          is_active: signaledStatus === 'active'
        }], { onConflict: 'email' })

      if (error) {
        showFormFeedback(`Erro ao liberar acesso: ${error.message}`, 'error', feedbackId)
        return
      }
    } else {
      const { error } = await supabaseClient
        .from('user_access')
        .upsert([{
          user_id: profileId,
          role: normalizedAccessRole,
          status: signaledStatus,
          approved_by: currentUser.email,
          approved_at: new Date().toISOString()
        }], { onConflict: 'user_id' })

      if (error && !isMissingTableError(error, 'user_access')) {
        showFormFeedback(`Erro ao liberar acesso: ${error.message}`, 'error', feedbackId)
        return
      }
    }

    if (profileId) {
      const profileUpdate = {
        role: normalizedPortal,
        global_role: getGlobalRoleForPortalRole(normalizedPortal, profileResult.data?.global_role || ''),
        status: signaledStatus === 'pending' ? 'pending' : signaledStatus
      }

      const { error: profileUpdateError } = await updateProfileRecordWithFallback(profileId, profileUpdate)

      if (profileUpdateError) {
        showFormFeedback(`Acesso liberado, mas falha ao atualizar perfil: ${profileUpdateError.message}`, 'warning', feedbackId)
        return
      }
    }

    addAdminAccessAuditEntry({
      action: 'Acesso concedido',
      target_email: email,
      performed_by_email: currentUser.email,
      details: `Portal: ${portal} | Status: ${signaledStatus}`
    })

    showFormFeedback('Acesso registrado com sucesso.', 'success', feedbackId)
    if (emailInput) emailInput.value = ''
    if (statusSelect) statusSelect.value = 'active'
    if (barbershopSelect) barbershopSelect.value = ''
    handleAdminAccessPortalChange()
    await carregarAdminAcessos()
  } catch (error) {
    showFormFeedback(`Erro ao registrar acesso: ${error.message || 'Tente novamente.'}`, 'error', feedbackId)
  }
}

async function carregarAdminUsuarios() {
  const currentUser = await ensureAdminAccess()
  if (!currentUser) {
    return
  }

  const [profilesResult, barberAccessResult, barbershopsResult] = await Promise.all([
    supabaseClient
      .from('profiles')
      .select('id, email, role, global_role, name, phone, barbershop_id')
      .order('role', { ascending: true })
      .order('email', { ascending: true }),
    supabaseClient
      .from('barber_access')
      .select('email, barbershop_id, is_active'),
    supabaseClient
      .from('barbershops')
      .select('id, name')
  ])

  if (profilesResult.error) {
    renderManagementMessage('admin-users-customers-list', `Erro ao carregar usuarios: ${profilesResult.error.message}`)
    renderManagementMessage('admin-users-barbershops-list', `Erro ao carregar usuarios: ${profilesResult.error.message}`)
    renderManagementMessage('admin-users-admins-list', `Erro ao carregar usuarios: ${profilesResult.error.message}`)
    return
  }

  const barbershopNameById = new Map((barbershopsResult.data || []).map((item) => [item.id, item.name]))
  const barbershopSelect = document.getElementById('admin-user-barbershop')

  if (barbershopSelect) {
    barbershopSelect.innerHTML = [
      '<option value="">Selecione a barbearia</option>',
      ...(barbershopsResult.data || []).map((item) => `<option value="${item.id}">${item.name}</option>`)
    ].join('')
  }

  const usersByEmail = new Map()

  ;(profilesResult.data || []).forEach((item) => {
    const key = String(item.email || item.id || '').trim().toLowerCase()
    if (!key) {
      return
    }

    usersByEmail.set(key, {
      id: item.id,
      email: item.email || '',
      role: normalizePortalRole(item.role || CUSTOMER_ROLE),
      global_role: item.global_role || '',
      name: item.name || '',
      phone: item.phone || '',
      barbershop_id: item.barbershop_id || null,
      source: 'profile'
    })
  })

  ;(barberAccessResult.data || []).forEach((item) => {
    const key = String(item.email || '').trim().toLowerCase()
    if (!key) {
      return
    }

    const existingUser = usersByEmail.get(key)

    if (existingUser) {
      usersByEmail.set(key, {
        ...existingUser,
        role: existingUser.role || BARBER_ROLE,
        global_role: existingUser.global_role || BARBER_ROLE,
        barbershop_id: existingUser.barbershop_id || item.barbershop_id || null,
        access_active: item.is_active
      })
      return
    }

    usersByEmail.set(key, {
      id: key,
      email: item.email,
      role: BARBER_ROLE,
      global_role: BARBER_ROLE,
      name: '',
      phone: '',
      barbershop_id: item.barbershop_id || null,
      access_active: item.is_active,
      source: 'barber_access'
    })
  })

  if (!usersByEmail.has(ADMIN_EMAIL)) {
    usersByEmail.set(ADMIN_EMAIL, {
      id: currentUser.id || ADMIN_EMAIL,
      email: ADMIN_EMAIL,
      role: ADMIN_ROLE,
      global_role: 'super_admin',
      name: 'Administrador principal',
      phone: '',
      barbershop_id: null,
      source: 'system'
    })
  }

  const users = Array.from(usersByEmail.values()).sort((a, b) => {
    const roleDiff = String(a.role || '').localeCompare(String(b.role || ''))
    if (roleDiff !== 0) {
      return roleDiff
    }

    return String(a.email || '').localeCompare(String(b.email || ''))
  })

  const customers = users.filter((item) => item.global_role !== BARBER_ROLE && item.role === CUSTOMER_ROLE)
  const barbershops = users
    .filter((item) => item.global_role === BARBER_ROLE)
    .map((item) => ({
      ...item,
      meta: [
        `Email: ${item.email || '-'}`,
        formatOptionalContactLine('Telefone', item.phone),
        item.barbershop_id ? `Barbearia: ${barbershopNameById.get(item.barbershop_id) || item.barbershop_id}` : null,
        item.global_role ? `Regra global: ${item.global_role}` : null,
        item.source === 'barber_access' ? 'Status: aguardando perfil completo' : null,
        item.access_active === false ? 'Acesso: inativo' : null
      ].filter(Boolean).join(' | ')
    }))
  const admins = users.filter((item) => item.role === ADMIN_ROLE || item.global_role === 'super_admin')

  renderAdminUsersGroup('admin-users-customers-list', customers, 'Nenhum usuario do portal cliente cadastrado.')
  renderAdminUsersGroup('admin-users-barbershops-list', barbershops, 'Nenhum usuario do portal da barbearia cadastrado.')
  renderAdminUsersGroup('admin-users-admins-list', admins, 'Nenhum usuario administrador cadastrado.')
}

function renderAdminUsersGroup(containerId, users, emptyMessage) {
  const container = document.getElementById(containerId)
  if (!container) {
    return
  }

  if (!users.length) {
    renderManagementMessage(containerId, emptyMessage)
    return
  }

  container.innerHTML = users
    .map((user) => `
      <div class="management-row user-management-row">
        <div class="user-management-content">
          <strong>${user.name || user.email || 'Usuario sem nome'}</strong>
          <span class="management-meta">${user.meta || [
            `Email: ${user.email || '-'}`,
            formatOptionalContactLine('Telefone', user.phone),
            user.barbershop_id ? `Barbearia: ${user.barbershop_id}` : null
          ].filter(Boolean).join(' | ')}</span>
        </div>
        <div class="admin-actions user-management-actions">
          <button type="button" class="user-action-button" onclick="editarTelefoneUsuario('${user.id}', '${escapeTemplateString(user.phone || '')}')">Editar telefone</button>
          <button type="button" class="user-action-button" onclick="editarEmailUsuario('${user.id}', '${escapeTemplateString(user.email || '')}')">Alterar email</button>
          <button type="button" class="user-action-button user-action-button-primary" onclick="redefinirSenhaUsuario('${escapeTemplateString(user.id || '')}', '${escapeTemplateString(user.email || '')}', '${escapeTemplateString(user.name || '')}', '${escapeTemplateString(user.source || 'profile')}')">Alterar senha</button>
        </div>
      </div>
    `)
    .join('')
}

function renderAdminSummary(barbershops, profiles, accesses, appointments, serviceSales, productSales, productSalesError = null, subscriptions = [], subscriptionsError = null) {
  const container = document.getElementById('admin-summary')
  if (!container) {
    return
  }

  const activeAccesses = (accesses || []).filter((item) => item.is_active).length
  const barberProfiles = (profiles || []).filter((item) => normalizePortalRole(item.role) === BARBER_ROLE).length
  const customerProfiles = (profiles || []).filter((item) => normalizePortalRole(item.role) === CUSTOMER_ROLE).length
  const totalServiceRevenue = (serviceSales || []).reduce((sum, item) => sum + Number(item.service_price || 0), 0)
  const totalProductRevenue = productSalesError
    ? 0
    : (productSales || []).reduce((sum, item) => sum + Number(item.total_amount || 0), 0)
  const activeSubscriptions = subscriptionsError
    ? []
    : (subscriptions || []).filter((item) => String(item.status || 'active') === 'active')
  const recurringRevenue = activeSubscriptions.reduce((sum, item) => sum + getPlanDefinition(item.plan_code).monthlyPrice, 0)

  const cards = [
    { label: 'Barbearias', value: String((barbershops || []).length) },
    { label: 'Barbeiros com perfil', value: String(barberProfiles) },
    { label: 'Clientes cadastrados', value: String(customerProfiles) },
    { label: 'Acessos ativos', value: String(activeAccesses) },
    { label: 'Assinaturas ativas', value: subscriptionsError ? 'Tabela ausente' : String(activeSubscriptions.length) },
    { label: 'Agendamentos recentes', value: String((appointments || []).length) },
    { label: 'Receita recorrente', value: subscriptionsError ? 'Tabela ausente' : formatCurrency(recurringRevenue) },
    { label: 'Faturamento de servicos', value: formatCurrency(totalServiceRevenue) },
    { label: 'Faturamento de produtos', value: productSalesError ? 'Tabela ausente' : formatCurrency(totalProductRevenue) },
    { label: 'Faturamento total', value: productSalesError ? formatCurrency(totalServiceRevenue) : formatCurrency(totalServiceRevenue + totalProductRevenue) }
  ]

  container.innerHTML = cards
    .map((card) => `
      <article class="metric-card">
        <span class="metric-label">${card.label}</span>
        <strong class="metric-value">${card.value}</strong>
      </article>
    `)
    .join('')
}

function renderAdminPlansDistribution(subscriptions, subscriptionsError = null) {
  const container = document.getElementById('admin-plan-distribution')
  if (!container) {
    return
  }

  if (subscriptionsError && isMissingTableError(subscriptionsError, 'saas_subscriptions')) {
    renderManagementMessage('admin-plan-distribution', 'Crie a tabela saas_subscriptions para acompanhar os planos do SaaS.')
    return
  }

  const grouped = new Map()
  ;(subscriptions || []).forEach((item) => {
    const plan = getPlanDefinition(item.plan_code)
    const current = grouped.get(plan.code) || { count: 0, revenue: 0 }
    current.count += 1
    current.revenue += plan.monthlyPrice
    grouped.set(plan.code, current)
  })

  const rows = Object.keys(SAAS_PLAN_DEFINITIONS).map((planCode) => {
    const plan = getPlanDefinition(planCode)
    const data = grouped.get(planCode) || { count: 0, revenue: 0 }
    return {
      title: plan.label,
      meta: `${data.count} barbearia(s) | ${plan.maxAppointmentsPerMonth} agendamentos/mes | ${plan.maxBarbers} barbeiro(s)`,
      value: formatCurrency(data.revenue)
    }
  })

  renderManagementRows('admin-plan-distribution', rows, 'Nenhum plano encontrado.')
}

function renderAdminBarbershopsOverview(items, serviceSales = [], productSales = [], subscriptions = []) {
  const container = document.getElementById('admin-barbershops-overview')
  if (!container) {
    return
  }

  if (!items.length) {
    renderManagementMessage('admin-barbershops-overview', 'Nenhuma barbearia cadastrada ainda.')
    return
  }

  const revenueByBarbershop = new Map()

  serviceSales.forEach((item) => {
    const current = revenueByBarbershop.get(item.barbershop_id) || { serviceRevenue: 0, productRevenue: 0 }
    current.serviceRevenue += Number(item.service_price || 0)
    revenueByBarbershop.set(item.barbershop_id, current)
  })

  productSales.forEach((item) => {
    const current = revenueByBarbershop.get(item.barbershop_id) || { serviceRevenue: 0, productRevenue: 0 }
    current.productRevenue += Number(item.total_amount || 0)
    revenueByBarbershop.set(item.barbershop_id, current)
  })

  container.innerHTML = items
    .slice(0, 8)
    .map((item) => {
      const subscription = (subscriptions || []).find((entry) => entry.barbershop_id === item.id)
      const plan = getPlanDefinition(subscription?.plan_code)
      return `
      <div class="management-row">
        <div>
          <strong>${item.name}</strong>
          <span class="management-meta">ID: ${item.id} | Plano: ${plan.label} | Servicos: ${formatCurrency(revenueByBarbershop.get(item.id)?.serviceRevenue || 0)} | Produtos: ${formatCurrency(revenueByBarbershop.get(item.id)?.productRevenue || 0)}</span>
        </div>
        <span class="management-badge">${formatCurrency((revenueByBarbershop.get(item.id)?.serviceRevenue || 0) + (revenueByBarbershop.get(item.id)?.productRevenue || 0))}</span>
      </div>
    `
    })
    .join('')
}

function renderAdminAppointments(items) {
  const container = document.getElementById('admin-appointments-list')
  if (!container) {
    return
  }

  if (!items.length) {
    renderManagementMessage('admin-appointments-list', 'Nenhum agendamento encontrado na plataforma.')
    return
  }

  container.innerHTML = items
    .map((item) => `
      <div class="management-row">
        <div>
          <strong>${item.customer_name || 'Cliente nao informado'}</strong>
          <span class="management-meta">${item.barbershops?.name || 'Barbearia nao identificada'} | ${item.appointment_time ? new Date(item.appointment_time).toLocaleString() : '-'}</span>
        </div>
      </div>
    `)
    .join('')
}

function renderAdminBarbershopsList(items, subscriptions = []) {
  const container = document.getElementById('admin-barbershops-list')
  if (!container) {
    return
  }

  if (!items.length) {
    renderManagementMessage('admin-barbershops-list', 'Nenhuma barbearia cadastrada ainda.')
    return
  }

  container.innerHTML = items
    .map((item) => {
      const subscription = (subscriptions || []).find((entry) => entry.barbershop_id === item.id)
      const plan = getPlanDefinition(subscription?.plan_code)
      return `
      <div class="management-row">
        <div>
          <strong>${item.name}</strong>
          <span class="management-meta">${[
            `ID da unidade: ${item.id}`,
            `Plano: ${plan.label}`,
            item.slug ? `Slug: ${item.slug}` : null,
            formatOptionalContactLine('Telefone', item.phone),
            formatOptionalContactLine('Email', item.email)
          ].filter(Boolean).join(' | ')}</span>
        </div>
        <div class="admin-actions">
          <span class="management-badge">${item.owner_id ? buildPlanBadge(plan.code) : 'Aguardando responsavel'}</span>
          <button type="button" class="edit-button" onclick="editarBarbeariaAdmin('${item.id}')">Editar</button>
          <button type="button" class="edit-button" onclick="selecionarContextoAdminDaBarbearia('${item.id}')">Abrir operacao</button>
        </div>
      </div>
    `
    })
    .join('')
}

function renderAdminAccessList(items) {
  const container = document.getElementById('admin-access-list')
  if (!container) {
    return
  }

  if (!items.length) {
    renderManagementMessage('admin-access-list', 'Nenhum usuario encontrado para os filtros selecionados.')
    return
  }

  const grouped = items.reduce((map, item) => {
    const groupKey = item.barbershop_name || 'Sem barbearia'
    const bucket = map.get(groupKey) || []
    bucket.push(item)
    map.set(groupKey, bucket)
    return map
  }, new Map())

  container.innerHTML = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupName, groupItems]) => `
      <section class="access-group">
        <div class="access-group-header">
          <div>
            <strong>${groupName}</strong>
            <span class="management-meta">${groupItems[0]?.barbershop_location || 'Sem localizacao'} | ${groupItems.length} usuario(s)</span>
          </div>
        </div>
        <div class="access-group-stack">
          ${groupItems.map((item) => {
            const statusMeta = getAccessStatusMeta(item.status)
            const roleMeta = getRoleBadgeMeta(item.role)
            const isBlocked = item.status === 'blocked'
            return `
              <article class="access-user-card ${selectedAdminAccessKey === item.accessKey ? 'is-selected' : ''}">
                <div class="access-user-main">
                  <div class="access-user-identity">
                    <strong>${item.name || item.email || 'Usuario sem nome'}</strong>
                    <span class="management-meta">${item.email || '-'}</span>
                  </div>
                  <div class="access-user-badges">
                    <span class="role-badge ${roleMeta.className}">${roleMeta.label}</span>
                    <span class="status-badge ${statusMeta.className}">${statusMeta.label}</span>
                    ${item.profileStatus ? `<span class="status-badge ${getAccessStatusMeta(item.profileStatus).className}">Perfil: ${getAccessStatusMeta(item.profileStatus).label}</span>` : ''}
                  </div>
                </div>
                <div class="access-user-details">
                  <span>Barbearia: ${item.barbershop_name || 'Sem barbearia'}</span>
                  <span>Ultimo acesso: ${formatAdminDate(item.last_login_at)}</span>
                  <span>Criado em: ${formatAdminDate(item.created_at || item.approved_at)}</span>
                  <span>Liberado por: ${item.approved_by_email || ADMIN_EMAIL}</span>
                </div>
                <div class="access-user-actions">
                  <button type="button" class="edit-button" onclick="abrirEditorDeAcessoAdmin('${item.accessKey}')">Editar permissoes</button>
                  <button type="button" class="secondary-action" onclick="editarEmailUsuario('${escapeTemplateString(item.id || '')}', '${escapeTemplateString(item.email || '')}')">Alterar email</button>
                  <button type="button" class="secondary-action" onclick="editarTelefoneUsuario('${escapeTemplateString(item.id || '')}', '${escapeTemplateString(item.phone || '')}')">Alterar telefone</button>
                  <button type="button" class="secondary-action" onclick="abrirEditorDeAcessoAdmin('${item.accessKey}', true)">Transferir</button>
                  <button type="button" class="${isBlocked ? 'secondary-action' : 'danger-action'}" onclick="alternarBloqueioDeAcessoAdmin('${item.accessKey}')">${isBlocked ? 'Desbloquear' : 'Bloquear'}</button>
                  <button type="button" class="danger-action" onclick="revogarAcessoAdmin('${item.accessKey}')">Revogar</button>
                </div>
              </article>
            `
          }).join('')}
        </div>
      </section>
    `)
    .join('')
}

function findAdminAccessEntry(accessKey) {
  return adminAccessDirectoryCache.find((item) => item.accessKey === accessKey) || null
}

function renderAdminAccessEditorPermissions(role) {
  const container = document.getElementById('admin-access-editor-permissions')
  if (!container) {
    return
  }

  const permissions = getPortalPermissionsByRole(role)
  if (!permissions.length) {
    renderManagementMessage('admin-access-editor-permissions', 'Nenhuma permissao configurada para este perfil.')
    return
  }

  container.innerHTML = permissions.map((permission) => `
    <div class="management-row compact-row">
      <div>
        <strong>${permission}</strong>
        <span class="management-meta">Permissao herdada do perfil selecionado.</span>
      </div>
      <span class="management-badge">Ativa</span>
    </div>
  `).join('')
}

window.abrirEditorDeAcessoAdmin = function (accessKey, focusBarbershop = false) {
  const entry = findAdminAccessEntry(accessKey)
  const card = document.getElementById('admin-access-editor-card')

  if (!entry || !card) {
    return
  }

  selectedAdminAccessKey = accessKey
  document.getElementById('admin-access-editor-name').value = entry.name || ''
  document.getElementById('admin-access-editor-email').value = entry.email || ''
  document.getElementById('admin-access-editor-phone').value = entry.phone || ''
  document.getElementById('admin-access-editor-role').value = entry.role || CUSTOMER_ROLE
  document.getElementById('admin-access-editor-status').value = entry.status || 'active'
  document.getElementById('admin-access-editor-barbershop').value = entry.barbershop_id || ''
  card.style.display = 'block'
  setAdminAccessEditorFeedback('', 'info')
  renderAdminAccessEditorPermissions(entry.role || CUSTOMER_ROLE)
  filtrarAdminAcessos()

  if (focusBarbershop) {
    document.getElementById('admin-access-editor-barbershop')?.focus()
  }
}

window.fecharEditorDeAcessoAdmin = function () {
  selectedAdminAccessKey = null
  const card = document.getElementById('admin-access-editor-card')
  if (card) {
    card.style.display = 'none'
  }
  setAdminAccessEditorFeedback('', 'info')
  filtrarAdminAcessos()
}

document.addEventListener('change', (event) => {
  if (event.target?.id === 'admin-access-editor-role') {
    renderAdminAccessEditorPermissions(event.target.value)
  }
})

window.filtrarAdminAcessos = function () {
  const searchTerm = document.getElementById('admin-access-search')?.value?.trim().toLowerCase() || ''
  const statusFilter = document.getElementById('admin-access-status-filter')?.value || ''
  const roleFilter = document.getElementById('admin-access-role-filter')?.value || ''
  const barbershopFilter = document.getElementById('admin-access-barbershop-filter')?.value || ''

  const filtered = adminAccessDirectoryCache.filter((item) => {
    const matchesSearch = !searchTerm || [item.name, item.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchTerm))
    const matchesStatus = !statusFilter || item.status === statusFilter
    const matchesRole = !roleFilter || item.role === roleFilter
    const matchesBarbershop = !barbershopFilter || item.barbershop_id === barbershopFilter
    return matchesSearch && matchesStatus && matchesRole && matchesBarbershop
  })

  const resultsInfo = document.getElementById('admin-access-results-info')
  if (resultsInfo) {
    resultsInfo.textContent = filtered.length
      ? `${filtered.length} usuario(s) encontrados.`
      : 'Nenhum usuario encontrado.'
  }

  renderAdminAccessKpis(filtered)
  renderAdminAccessList(filtered)
}

async function syncAdminAccessEntry(entry, nextRole, nextBarbershopId, nextName, nextStatus = 'active') {
  const currentUser = await ensureAdminAccess()
  if (!currentUser) {
    return { error: new Error('Acesso negado') }
  }

  const normalizedPortalRole = normalizePortalRole(nextRole)
  const normalizedAccessRole = normalizeAccessRole(normalizedPortalRole)
  const currentAccessRole = normalizeAccessRole(entry.accessRole || entry.role)
  const needsBarbershopContext = normalizedPortalRole === BARBER_ROLE || normalizedPortalRole === ADMIN_ROLE
  const normalizedStatus = nextStatus === 'blocked' ? 'blocked' : nextStatus === 'pending' ? 'pending' : 'active'

  if (needsBarbershopContext && !nextBarbershopId) {
    return { error: new Error('Selecione uma barbearia para usuarios do portal da barbearia.') }
  }

  if (entry.id && entry.id !== entry.accessKey) {
    const updatePayload = {
      role: normalizedPortalRole,
      global_role: getGlobalRoleForPortalRole(normalizedPortalRole, entry.global_role || ''),
      name: nextName || null,
      barbershop_id: needsBarbershopContext ? nextBarbershopId : null
    }

    const profileResult = await updateProfileRecordWithFallback(entry.id, updatePayload)

    if (profileResult.error) {
      return { error: profileResult.error }
    }
  }

  if (entry.id && entry.id !== entry.accessKey && (entry.barbershop_id || nextBarbershopId)) {
    if (entry.barbershop_id && entry.barbershop_id !== nextBarbershopId) {
      const { error: blockPreviousAccessError } = await syncManagedUserAccess(
        entry.id,
        entry.barbershop_id,
        currentAccessRole,
        'blocked'
      )

      if (blockPreviousAccessError) {
        return { error: blockPreviousAccessError }
      }
    }

    if (nextBarbershopId) {
      const { data: accessData, error: accessError } = await syncManagedUserAccess(
        entry.id,
        nextBarbershopId,
        normalizedAccessRole,
        normalizedStatus === 'pending' ? 'pending' : normalizedStatus
      )

      if (accessError) {
        return { error: accessError }
      }

      if (accessData?.error) {
        return { error: new Error(accessData.error) }
      }
    }
  }

  if (entry.email) {
    const hadAccessRecord = String(entry.source || '').includes('access')
    const shouldKeepPortalAccess = needsBarbershopContext

    if (shouldKeepPortalAccess) {
      const accessResult = await supabaseClient
        .from('barber_access')
        .upsert([{
          email: entry.email,
          barbershop_id: nextBarbershopId,
          approved_by_email: currentUser.email,
          approved_at: new Date().toISOString(),
          is_active: normalizedStatus === 'active'
        }], { onConflict: 'email' })

      if (accessResult.error) {
        return { error: accessResult.error }
      }
    } else if (hadAccessRecord) {
      const accessResult = await supabaseClient
        .from('barber_access')
        .update({
          barbershop_id: entry.barbershop_id || null,
          is_active: false
        })
        .eq('email', entry.email)

      if (accessResult.error) {
        return { error: accessResult.error }
      }
    }
  }

  return { error: null }
}

async function updateAdminAccessEntryPhone(entry, nextPhone) {
  if (!entry?.id || entry.id === entry.accessKey) {
    return { error: null }
  }

  const normalizedPhone = String(nextPhone || '').trim()
  const phoneResult = await updateProfileRecordWithFallback(entry.id, { phone: normalizedPhone || null }, ['phone'])

  return { error: phoneResult.error || null }
}

window.abrirEdicaoEmailNoAcessoAdmin = async function () {
  const entry = findAdminAccessEntry(selectedAdminAccessKey)
  if (!entry) {
    setAdminAccessEditorFeedback('Selecione um usuario para editar.', 'error')
    return
  }

  await editarEmailUsuario(entry.id, entry.email || '')
  await carregarAdminAcessos()
}

window.abrirEdicaoTelefoneNoAcessoAdmin = async function () {
  const entry = findAdminAccessEntry(selectedAdminAccessKey)
  if (!entry) {
    setAdminAccessEditorFeedback('Selecione um usuario para editar.', 'error')
    return
  }

  await editarTelefoneUsuario(entry.id, entry.phone || '')
  await carregarAdminAcessos()
}

window.salvarEditorDeAcessoAdmin = async function () {
  const entry = findAdminAccessEntry(selectedAdminAccessKey)
  if (!entry) {
    setAdminAccessEditorFeedback('Selecione um usuario para editar.', 'error')
    return
  }

  const nextRole = document.getElementById('admin-access-editor-role')?.value || entry.role
  const nextStatus = document.getElementById('admin-access-editor-status')?.value || entry.status || 'active'
  const nextBarbershopId = document.getElementById('admin-access-editor-barbershop')?.value || ''
  const nextName = document.getElementById('admin-access-editor-name')?.value?.trim() || ''
  const nextPhone = document.getElementById('admin-access-editor-phone')?.value?.trim() || ''

  setAdminAccessEditorFeedback('Salvando alteracoes...', 'info')
  const result = await syncAdminAccessEntry(entry, nextRole, nextBarbershopId, nextName, nextStatus)

  if (result.error) {
    setAdminAccessEditorFeedback(`Erro ao salvar: ${result.error.message}`, 'error')
    return
  }

  const phoneResult = await updateAdminAccessEntryPhone(entry, nextPhone)
  if (phoneResult.error) {
    setAdminAccessEditorFeedback(`Erro ao salvar telefone: ${phoneResult.error.message}`, 'error')
    return
  }

  if (entry.id && entry.id !== entry.accessKey) {
    const profileStatusResult = await updateProfileRecordWithFallback(entry.id, { status: nextStatus }, ['status'])

    if (profileStatusResult.error) {
      setAdminAccessEditorFeedback(`Erro ao salvar status: ${profileStatusResult.error.message}`, 'error')
      return
    }
  }

  addAdminAccessAuditEntry({
    action: 'Perfil atualizado',
    target_email: entry.email,
    performed_by_email: currentSession?.user?.email || ADMIN_EMAIL,
    details: `Role: ${nextRole} | Status: ${nextStatus}${nextBarbershopId ? ' | Contexto ajustado' : ''}${nextPhone ? ' | Telefone ajustado' : ''}`
  })

  showAppToast('Permissoes atualizadas com sucesso.', 'success')
  fecharEditorDeAcessoAdmin()
  await carregarAdminAcessos()
}

window.alternarBloqueioDeAcessoAdmin = async function (accessKey) {
  const entry = findAdminAccessEntry(accessKey)
  const currentUser = await ensureAdminAccess()
  if (!entry || !currentUser) {
    return
  }

  const shouldBlock = entry.status !== 'blocked'
  const nextIsActive = !shouldBlock
  const nextProfileStatus = shouldBlock ? 'blocked' : 'active'
  const nextAccessStatus = shouldBlock ? 'blocked' : 'active'

  if (entry.id && entry.id !== entry.accessKey && entry.barbershop_id) {
    const { data, error } = await syncManagedUserAccess(
      entry.id,
      entry.barbershop_id,
      normalizeAccessRole(entry.accessRole || entry.role),
      nextAccessStatus
    )

    if (error) {
      showAppToast(`Erro ao atualizar acesso principal: ${error.message}`, 'error')
      return
    }

    if (data?.error) {
      showAppToast(`Erro ao atualizar acesso principal: ${data.error}`, 'error')
      return
    }
  }

  if (entry.email) {
    const accessResult = await supabaseClient
      .from('barber_access')
      .upsert([{
        email: entry.email,
        barbershop_id: entry.barbershop_id || null,
        approved_by_email: currentUser.email,
        approved_at: entry.approved_at || new Date().toISOString(),
        is_active: nextIsActive
      }], { onConflict: 'email' })

    if (accessResult.error) {
      showAppToast(`Erro ao atualizar acesso: ${accessResult.error.message}`, 'error')
      return
    }
  }

  if (entry.id && entry.id !== entry.accessKey) {
    const profileResult = await updateProfileRecordWithFallback(entry.id, { status: nextProfileStatus }, ['status'])

    if (profileResult.error) {
      showAppToast(`Erro ao atualizar status: ${profileResult.error.message}`, 'error')
      return
    }
  }

  addAdminAccessAuditEntry({
    action: shouldBlock ? 'Usuario bloqueado' : 'Usuario desbloqueado',
    target_email: entry.email,
    performed_by_email: currentUser.email,
    details: entry.barbershop_name || 'Seguranca'
  })

  showAppToast(shouldBlock ? 'Usuario bloqueado.' : 'Usuario desbloqueado.', 'success')
  await carregarAdminAcessos()
}

window.revogarAcessoAdmin = async function (accessKey) {
  const entry = findAdminAccessEntry(accessKey)
  const currentUser = await ensureAdminAccess()
  if (!entry || !currentUser) {
    return
  }

  if (!entry.email) {
    showAppToast('Nao foi possivel identificar o email deste usuario.', 'error')
    return
  }

  if (entry.id && entry.id !== entry.accessKey && entry.barbershop_id) {
    const { data, error } = await syncManagedUserAccess(
      entry.id,
      entry.barbershop_id,
      normalizeAccessRole(entry.accessRole || entry.role),
      'blocked'
    )

    if (error) {
      showAppToast(`Erro ao revogar acesso principal: ${error.message}`, 'error')
      return
    }

    if (data?.error) {
      showAppToast(`Erro ao revogar acesso principal: ${data.error}`, 'error')
      return
    }
  }

  const accessResult = await supabaseClient
    .from('barber_access')
    .update({ is_active: false })
    .eq('email', entry.email)

  if (accessResult.error) {
    showAppToast(`Erro ao revogar acesso: ${accessResult.error.message}`, 'error')
    return
  }

  addAdminAccessAuditEntry({
    action: 'Acesso revogado',
    target_email: entry.email,
    performed_by_email: currentUser.email,
    details: entry.barbershop_name || 'Sem barbearia'
  })

  showAppToast('Acesso revogado com sucesso.', 'success')
  await carregarAdminAcessos()
}

window.editarTelefoneUsuario = async function (userId, currentPhone = '') {
  const currentUser = await ensureAdminAccess()
  if (!currentUser) {
    return
  }

  const nextPhone = prompt('Informe o novo telefone do usuario:', currentPhone || '')

  if (nextPhone === null) {
    return
  }

  const normalizedPhone = nextPhone.trim()

  const { error } = await updateProfileRecordWithFallback(userId, { phone: normalizedPhone }, ['phone'])

  if (error) {
    alert(`Erro ao atualizar telefone: ${error.message}`)
    return
  }

  alert('Telefone atualizado com sucesso.')
  await carregarAdminUsuarios()
}

window.editarEmailUsuario = async function (userId, currentEmail = '') {
  const currentUser = await ensureAdminAccess()
  if (!currentUser) {
    return
  }

  const nextEmail = prompt('Informe o novo email do usuario:', currentEmail || '')

  if (nextEmail === null) {
    return
  }

  const normalizedEmail = nextEmail.trim().toLowerCase()

  if (!normalizedEmail) {
    alert('Informe um email valido.')
    return
  }

  if (userId !== currentUser.id) {
    alert('A troca direta do email de outro usuario exige um backend seguro com permissao administrativa do Supabase. No painel atual, a alteracao direta fica liberada apenas para a propria conta admin.')
    return
  }

  const { error: authError } = await supabaseClient.auth.updateUser({
    email: normalizedEmail
  })

  if (authError) {
    alert(`Erro ao atualizar email de acesso: ${authError.message}`)
    return
  }

  const { error: profileError } = await supabaseClient
    .from('profiles')
    .update({ email: normalizedEmail })
    .eq('id', userId)

  if (profileError) {
    alert(`Email de acesso alterado, mas nao foi possivel atualizar o perfil: ${profileError.message}`)
    return
  }

  alert('Email atualizado com sucesso. Verifique a confirmacao enviada pelo Supabase se ela estiver habilitada.')
  await carregarAdminUsuarios()
}

function setAdminPasswordModalFeedback(message = '', type = 'info') {
  const feedback = document.getElementById('admin-password-modal-feedback')
  if (!feedback) {
    if (message) {
      showAppToast(message, type)
    }
    return
  }

  if (!message) {
    feedback.textContent = ''
    feedback.className = 'form-feedback'
    feedback.style.display = 'none'
    return
  }

  feedback.textContent = message
  feedback.className = `form-feedback form-feedback-${type}`
  feedback.style.display = 'block'
}

function setAdminPasswordModalLoading(isLoading) {
  const submitButton = document.getElementById('admin-password-modal-submit')
  if (!submitButton) {
    return
  }

  submitButton.disabled = isLoading
  submitButton.textContent = isLoading ? 'Salvando...' : 'Salvar nova senha'
}

window.fecharModalSenhaAdmin = function (event) {
  if (event && event.target && event.target !== event.currentTarget) {
    return
  }

  const modal = document.getElementById('admin-password-modal')
  if (!modal) {
    return
  }

  modal.style.display = 'none'
  adminPasswordModalTarget = null
  setAdminPasswordModalFeedback('', 'info')

  const passwordInput = document.getElementById('admin-password-modal-new-password')
  const confirmInput = document.getElementById('admin-password-modal-confirm-password')

  if (passwordInput) {
    passwordInput.value = ''
  }

  if (confirmInput) {
    confirmInput.value = ''
  }

  setAdminPasswordModalLoading(false)
}

window.redefinirSenhaUsuario = async function (userId, email, name = '', source = 'profile') {
  const currentUser = await ensureAdminAccess()
  if (!currentUser) {
    return
  }

  if (source === 'barber_access' || !isUuidValue(userId)) {
    showAppToast('Este usuario ainda nao concluiu o cadastro. A senha so pode ser alterada depois que a conta existir no Auth.', 'info')
    return
  }

  if (!email) {
    showAppToast('Este usuario nao possui email cadastrado.', 'error')
    return
  }

  adminPasswordModalTarget = {
    userId,
    email,
    name: name || email
  }

  const modal = document.getElementById('admin-password-modal')
  const targetLabel = document.getElementById('admin-password-modal-target')
  const passwordInput = document.getElementById('admin-password-modal-new-password')

  if (!modal || !targetLabel || !passwordInput) {
    showAppToast('Nao foi possivel abrir o popup de senha.', 'error')
    return
  }

  targetLabel.textContent = `${name || email} · ${email}`
  setAdminPasswordModalFeedback('', 'info')
  modal.style.display = 'flex'

  window.setTimeout(() => {
    passwordInput.focus()
  }, 40)
}

window.salvarNovaSenhaAdmin = async function () {
  const currentUser = await ensureAdminAccess()
  if (!currentUser) {
    return
  }

  if (!adminPasswordModalTarget?.userId) {
    setAdminPasswordModalFeedback('Nenhum usuario selecionado para alterar a senha.', 'error')
    return
  }

  const passwordInput = document.getElementById('admin-password-modal-new-password')
  const confirmInput = document.getElementById('admin-password-modal-confirm-password')
  const newPassword = passwordInput?.value || ''
  const confirmPassword = confirmInput?.value || ''

  if (!newPassword || !confirmPassword) {
    setAdminPasswordModalFeedback('Preencha a nova senha e a confirmacao.', 'error')
    return
  }

  if (newPassword.length < 6) {
    setAdminPasswordModalFeedback('A nova senha deve ter pelo menos 6 caracteres.', 'error')
    return
  }

  if (newPassword !== confirmPassword) {
    setAdminPasswordModalFeedback('As senhas digitadas nao coincidem.', 'error')
    return
  }

  setAdminPasswordModalFeedback('', 'info')
  setAdminPasswordModalLoading(true)

  try {
    const { data, error } = await invokeProtectedFunction('admin-reset-password', {
      userId: adminPasswordModalTarget.userId,
      email: adminPasswordModalTarget.email,
      newPassword
    }, {
      authErrorMessage: 'Sua sessao de administrador expirou. Faca login novamente para redefinir a senha.'
    })

    if (error) {
      setAdminPasswordModalFeedback(`Erro ao alterar senha: ${error.message}`, 'error')
      return
    }

    if (data?.error) {
      setAdminPasswordModalFeedback(`Erro ao alterar senha: ${data.error}`, 'error')
      return
    }

    showAppToast(`Senha atualizada com sucesso para ${adminPasswordModalTarget.email}.`, 'success')
    window.fecharModalSenhaAdmin()
  } catch (error) {
    console.error('admin password modal error', error)
    setAdminPasswordModalFeedback(`Erro ao alterar senha: ${error.message || 'falha inesperada.'}`, 'error')
  } finally {
    setAdminPasswordModalLoading(false)
  }
}

window.executarLimpezaDeUsuariosAdmin = async function () {
  const currentUser = await ensureAdminAccess()
  if (!currentUser) {
    return
  }

  const emailInput = document.getElementById('admin-cleanup-master-email')
  const confirmationInput = document.getElementById('admin-cleanup-confirmation')
  const feedback = document.getElementById('admin-cleanup-feedback')
  const submitButton = document.getElementById('admin-cleanup-submit')
  const masterEmail = emailInput?.value?.trim().toLowerCase() || ''
  const confirmationText = confirmationInput?.value?.trim().toUpperCase() || ''

  if (!masterEmail) {
    if (feedback) {
      feedback.textContent = 'Informe o email master que deve ser preservado.'
      feedback.className = 'form-feedback form-feedback-error'
      feedback.style.display = 'block'
    }
    return
  }

  if (confirmationText !== 'LIMPAR') {
    if (feedback) {
      feedback.textContent = 'Digite LIMPAR para confirmar a higienizacao.'
      feedback.className = 'form-feedback form-feedback-error'
      feedback.style.display = 'block'
    }
    return
  }

  if (feedback) {
    feedback.textContent = 'Executando higienizacao segura dos usuarios...'
    feedback.className = 'form-feedback form-feedback-info'
    feedback.style.display = 'block'
  }

  if (submitButton) {
    submitButton.disabled = true
    submitButton.textContent = 'Limpando usuarios...'
  }

  try {
    const { data, error } = await invokeProtectedFunction('admin-cleanup-users', {
      masterEmail
    }, {
      authErrorMessage: 'Sua sessao de administrador expirou. Faca login novamente para limpar os usuarios.'
    })

    if (error) {
      throw error
    }

    if (data?.error) {
      throw new Error(data.error)
    }

    if (feedback) {
      feedback.textContent = `Limpeza concluida. ${data?.deletedUsers || 0} usuario(s) removido(s); ${data?.keptUsers || 0} preservado(s).`
      feedback.className = 'form-feedback form-feedback-success'
      feedback.style.display = 'block'
    }

    if (confirmationInput) {
      confirmationInput.value = ''
    }

    showAppToast('Base de usuarios higienizada com sucesso.', 'success')
    await carregarAdminUsuarios()
    await carregarAdminAcessos()
    await carregarAdminDashboard()
  } catch (error) {
    console.error('admin cleanup error', error)
    if (feedback) {
      feedback.textContent = `Erro ao limpar usuarios: ${error.message || 'falha inesperada.'}`
      feedback.className = 'form-feedback form-feedback-error'
      feedback.style.display = 'block'
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false
      submitButton.textContent = 'Limpar base de usuarios'
    }
  }
}

window.resetPassword = async function () {
  const email = document.getElementById('email').value;
  setAuthFeedback('', 'info')

  if (!email) {
    setAuthFeedback('Digite seu email para redefinir a senha.', 'error')
    return;
  }

  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: isAdminEntryPage()
      ? getAppUrl('admin.html')
      : isBarberEntryPage()
        ? getAppUrl('barbearia.html')
        : getAppUrl('cliente.html')
  });

  if (error) {
    setAuthFeedback(`Erro ao enviar email: ${formatAuthErrorMessage(error, { email })}`, 'error')
    return;
  }

  setAuthFeedback('Email de recuperacao enviado. Verifique sua caixa de entrada.', 'success')
};
