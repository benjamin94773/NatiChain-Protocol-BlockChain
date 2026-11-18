import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Palette
    BG_DARK = RGBColor(11, 15, 25)       # Slate 950 deep
    CARD_BG = RGBColor(22, 30, 49)       # Slate 900
    TEXT_WHITE = RGBColor(255, 255, 255)
    TEXT_MUTED = RGBColor(148, 163, 184) # Slate 400
    EMERALD = RGBColor(16, 185, 129)     # Green
    CYAN = RGBColor(56, 189, 248)        # Sky/Cyan
    INDIGO = RGBColor(129, 140, 248)     # Indigo/Purple
    ROSE = RGBColor(244, 63, 94)         # Rose
    AMBER = RGBColor(245, 158, 11)       # Amber

    blank_layout = prs.slide_layouts[6]

    def set_slide_background(slide):
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = BG_DARK

    def add_header(slide, tag_text, title_text, category="PROYECTO #3 • MICROFINANZAS"):
        # Category Tag
        tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11), Inches(0.4))
        tf_tag = tag_box.text_frame
        tf_tag.word_wrap = True
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = f"{category}  |  {tag_text}".upper()
        p_tag.font.size = Pt(10)
        p_tag.font.bold = True
        p_tag.font.color.rgb = EMERALD
        p_tag.font.name = "Arial"

        # Main Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.85), Inches(11.7), Inches(0.8))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.size = Pt(26)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_WHITE
        p_title.font.name = "Arial"

    # =========================================================================
    # SLIDE 1: PORTADA
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)

    # Accent badge
    b1 = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.2), Inches(4.5), Inches(0.45))
    b1.fill.solid()
    b1.fill.fore_color.rgb = RGBColor(6, 78, 59)
    b1.line.color.rgb = EMERALD
    p = b1.text_frame.paragraphs[0]
    p.text = "PROYECTO #3 • MICROFINANZAS & BLOCKCHAIN"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = EMERALD
    p.alignment = PP_ALIGN.CENTER

    # Main Title
    t1 = s1.shapes.add_textbox(Inches(0.8), Inches(1.8), Inches(11.5), Inches(2.2))
    tf1 = t1.text_frame
    p1 = tf1.paragraphs[0]
    p1.text = "NatiChain Protocol"
    p1.font.size = Pt(46)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_WHITE
    p1.font.name = "Arial"

    p1_sub = tf1.add_paragraph()
    p1_sub.text = "Círculos de Ahorro Comunitario (Natilleras & Cadenas) en Blockchain"
    p1_sub.font.size = Pt(22)
    p1_sub.font.color.rgb = CYAN
    p1_sub.font.name = "Arial"
    p1_sub.space_before = Pt(10)

    p1_desc = tf1.add_paragraph()
    p1_desc.text = "Sustitución del tesorero tradicional por contratos inteligentes, bóvedas inmutables, reglas anti-mora y sorteos verificables on-chain."
    p1_desc.font.size = Pt(14)
    p1_desc.font.color.rgb = TEXT_MUTED
    p1_desc.space_before = Pt(12)

    # 3 Summary Cards
    cards_data = [
        ("Stack Tecnológico", "Solidity (0.8.24), Foundry, Viem, React & Tailwind CSS", EMERALD),
        ("Seguridad & Auditoría", "29 Tests Unitarios/Fuzzing, Chainlink VRF v2.5, Zero-Bias Shuffle", CYAN),
        ("Modelo Académico", "Inspirado en el Paper 'Good Reputation' de UC Berkeley", INDIGO)
    ]
    for i, (c_title, c_desc, c_color) in enumerate(cards_data):
        card = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + i*4.0), Inches(4.8), Inches(3.7), Inches(1.8))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = c_color
        tf = card.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = c_title
        pt.font.size = Pt(14)
        pt.font.bold = True
        pt.font.color.rgb = c_color
        pd = tf.add_paragraph()
        pd.text = c_desc
        pd.font.size = Pt(11)
        pd.font.color.rgb = TEXT_WHITE
        pd.space_before = Pt(8)

    # =========================================================================
    # SLIDE 2: CONTEXTO Y EL PROBLEMA REAL
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, "1. Contexto & Diagnóstico", "El Problema Real de las Natilleras y Cadenas en Colombia")

    # 2 Comparison Blocks
    m1 = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(2.3))
    m1.fill.solid()
    m1.fill.fore_color.rgb = CARD_BG
    m1.line.color.rgb = EMERALD
    tf = m1.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "🔄 La 'Cadena' o Pasanaku (Modelo ROSCA)"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = EMERALD
    p2 = tf.add_paragraph()
    p2.text = "• Grupo de N participantes aporta una cuota periódica fija.\n• En cada ronda, un participante distinto recibe el pozo total según orden de turnos.\n• Crítico: Riesgo de que quien cobra el Turno #1 abandone y deje de aportar."
    p2.font.size = Pt(12)
    p2.font.color.rgb = TEXT_WHITE
    p2.space_before = Pt(8)

    m2 = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.6), Inches(2.3))
    m2.fill.solid()
    m2.fill.fore_color.rgb = CARD_BG
    m2.line.color.rgb = INDIGO
    tf = m2.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "🏦 La 'Natillera' Tradicional (Modelo ASCA)"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = INDIGO
    p2 = tf.add_paragraph()
    p2.text = "• Fondo común acumulativo durante 6 a 12 meses (ej. ahorro navideño).\n• Al cierre del ciclo se reparte todo el capital más rendimientos acumulados.\n• Crítico: Pérdida por inflación y cobros discrecionales del tesorero."
    p2.font.size = Pt(12)
    p2.font.color.rgb = TEXT_WHITE
    p2.space_before = Pt(8)

    # 4 Failures Grid
    fails = [
        ("1. Riesgo de Custodia (Tesorero)", "Robo, pérdida personal o embargo judicial de la cuenta bancaria del tesorero.", ROSE),
        ("2. Morosidad y Abandono", "Participantes que reciben el dinero primero y se retiran sin terminar el ciclo.", ROSE),
        ("3. Sorteos Opacos / A Dedo", "El tesorero manipula el orden de turnos a favor de allegados sin transparencia.", ROSE),
        ("4. Pérdida por Inflación", "El dinero en efectivo guardado en alcancías pierde valor adquisitivo mes a mes.", ROSE)
    ]
    for i, (f_title, f_desc, f_col) in enumerate(fails):
        f_box = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + i*2.95), Inches(4.4), Inches(2.8), Inches(2.3))
        f_box.fill.solid()
        f_box.fill.fore_color.rgb = CARD_BG
        f_box.line.color.rgb = f_col
        tf = f_box.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = f_title
        pt.font.size = Pt(12)
        pt.font.bold = True
        pt.font.color.rgb = f_col
        pd = tf.add_paragraph()
        pd.text = f_desc
        pd.font.size = Pt(10.5)
        pd.font.color.rgb = TEXT_MUTED
        pd.space_before = Pt(6)

    # =========================================================================
    # SLIDE 3: LOS 3 ASPECTOS CLAVE DE BLOCKCHAIN (DEL PDF)
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, "2. Requerimientos del PDF", "Los 3 Aspectos Clave del Rol de Blockchain")

    pilars = [
        ("1. BÓVEDA INMUTABLE", "Sustitución del Tesorero Humano",
         "• El dinero reside en un Smart Contract sin permisos de drenado arbitrario.\n• Cero riesgo de apropiación, embargo personal o fuga del tesorero.\n• Fondos denominados en Activo Estable (cUSD) y bloqueados en un simulador de rendimiento DeFi para vencer la inflación.",
         EMERALD),
        ("2. REGLAS ANTI-MORA", "Garantía & Premios a Puntuales",
         "• Depósito de Garantía (Colateral) obligatorio para ingresar al círculo.\n• Si un miembro incumple, el contrato cubre su cuota automáticamente de su garantía.\n• Penalización automática del 10% por mora: las multas van directo al pozo de los cumplidos.",
         AMBER),
        ("3. SORTEO VERIFICABLE", "Transparencia Algorítmica",
         "• Eliminación total de sorteos de papelitos o decisiones manuales.\n• Esquema de compromiso previo en dos fases (Commitment-Reveal).\n• Oráculo Chainlink VRF y barajado Fisher-Yates sin sesgo matemático de módulo.",
         CYAN)
    ]
    for i, (p_tag, p_title, p_desc, p_color) in enumerate(pilars):
        box = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + i*3.95), Inches(1.8), Inches(3.75), Inches(5.0))
        box.fill.solid()
        box.fill.fore_color.rgb = CARD_BG
        box.line.color.rgb = p_color
        tf = box.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = p_tag
        pt.font.size = Pt(12)
        pt.font.bold = True
        pt.font.color.rgb = p_color
        pt2 = tf.add_paragraph()
        pt2.text = p_title
        pt2.font.size = Pt(15)
        pt2.font.bold = True
        pt2.font.color.rgb = TEXT_WHITE
        pt2.space_before = Pt(4)
        pd = tf.add_paragraph()
        pd.text = p_desc
        pd.font.size = Pt(11)
        pd.font.color.rgb = TEXT_MUTED
        pd.space_before = Pt(14)

    # =========================================================================
    # SLIDE 4: ARQUITECTURA MODULAR DE CONTRATOS
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, "3. Diseño de Software", "Estructura y Arquitectura de Smart Contracts")

    contracts = [
        ("SavingsCircleFactory.sol", "Fábrica y Registro", "Patrón Factory para desplegar círculos paramétricos (monto, días, cupos, multas, ROSCA/ASCA) y catalogarlos en una sola consulta.", EMERALD),
        ("SavingsCircle.sol (Core)", "Bóveda Inmutable", "Gestiona el ciclo de vida, rondas, cobro de cuotas, ejecución de garantías contra morosos y desembolsos automáticos.", EMERALD),
        ("MockYieldVault.sol", "Simulador DeFi Yield", "Genera rendimiento periódico base sobre el saldo bloqueado para proteger el ahorro comunitario contra la inflación.", AMBER),
        ("ReputationRegistry.sol", "Reputación Berkeley", "Score crediticio comunitario (100-1000) basado en pagos a tiempo, círculos completados y avales sociales entre miembros.", INDIGO),
        ("MockStablecoin.sol (cUSD)", "Token Estable ERC-20", "Paridad estable para evitar la volatilidad de ETH/BTC, con Faucet público para pruebas libres en la demo.", CYAN),
        ("VRF / Mock Randomness", "Oráculo de Aleatoriedad", "Interfaz desacoplada con adaptador Chainlink VRF v2.5 para testnets y simulador local determinístico para Anvil.", INDIGO)
    ]
    for i, (c_name, c_role, c_desc, c_color) in enumerate(contracts):
        row = i // 3
        col = i % 3
        c_box = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + col*3.95), Inches(1.8 + row*2.6), Inches(3.75), Inches(2.3))
        c_box.fill.solid()
        c_box.fill.fore_color.rgb = CARD_BG
        c_box.line.color.rgb = c_color
        tf = c_box.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = c_name
        pt.font.size = Pt(13)
        pt.font.bold = True
        pt.font.color.rgb = c_color
        pr = tf.add_paragraph()
        pr.text = c_role.upper()
        pr.font.size = Pt(9.5)
        pr.font.bold = True
        pr.font.color.rgb = TEXT_MUTED
        pr.space_before = Pt(2)
        pd = tf.add_paragraph()
        pd.text = c_desc
        pd.font.size = Pt(10)
        pd.font.color.rgb = TEXT_WHITE
        pd.space_before = Pt(8)

    # =========================================================================
    # SLIDE 5: EL SORTEO Y LA ALEATORIEDAD VERIFICABLE
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, "4. Criptografía y Seguridad", "El Sistema de Sorteos: Compromiso en 2 Fases y Fisher-Yates")

    # Left: why 1-step fails
    w1 = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9))
    w1.fill.solid()
    w1.fill.fore_color.rgb = CARD_BG
    w1.line.color.rgb = ROSE
    tf = w1.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "❌ ¿Por qué no usar 'random()' en 1 solo paso?"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = ROSE
    p2 = tf.add_paragraph()
    p2.text = (
        "• En la EVM no existe aleatoriedad nativa; es determinística.\n\n"
        "• Si se sortea usando 'block.timestamp' o 'prevrandao' en la misma transacción del último inscrito:\n"
        "   1. El último participante puede simular la tx localmente.\n"
        "   2. Si no le gusta el turno asignado (ej. último turno), revierte la transacción o cancela.\n"
        "   3. Los validadores o mineros pueden descartar bloques que no les favorezcan (Front-Running / MEV)."
    )
    p2.font.size = Pt(11.5)
    p2.font.color.rgb = TEXT_WHITE
    p2.space_before = Pt(12)

    # Right: our 2-step commit reveal
    w2 = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.6), Inches(4.9))
    w2.fill.solid()
    w2.fill.fore_color.rgb = CARD_BG
    w2.line.color.rgb = EMERALD
    tf = w2.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "✅ Nuestra Solución Criptográfica en 2 Fases"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = EMERALD
    p2 = tf.add_paragraph()
    p2.text = (
        "1. Fase de Compromiso (Commitment):\n"
        "   Al inscribirse el participante N, se congela la lista de participantes en un hash criptográfico y el círculo pasa a estado 'DRAW_PENDING'.\n\n"
        "2. Fase de Revelación (Oráculo Chainlink VRF):\n"
        "   Se solicita aleatoriedad externa verificable que ningún participante puede predecir ni alterar.\n\n"
        "3. Fisher-Yates con Muestreo por Rechazo:\n"
        "   Se descartan muestras residuales para eliminar el Sesgo de Módulo ('sample < threshold'), garantizando probabilidad perfectamente uniforme."
    )
    p2.font.size = Pt(11)
    p2.font.color.rgb = TEXT_WHITE
    p2.space_before = Pt(10)

    # =========================================================================
    # SLIDE 6: MECANISMOS ECONÓMICOS ANTI-MORA
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header(s6, "5. Tokenomics y Teoría de Juegos", "Mecanismo Anti-Mora y Protección del Beneficiario")

    eco_cards = [
        ("1. Depósito de Garantía (Colateral)", "Al unirse, cada miembro deposita una garantía inicial (ej. 150 cUSD). Esta garantía queda bloqueada en el Yield Vault y actúa como póliza de seguro contra el abandono.", EMERALD),
        ("2. Ejecución Forzosa por Impago", "Si un miembro no paga al vencer la ronda, el contrato descuenta automáticamente su cuota y multa de su garantía. El ganador del turno cobra sus 300 cUSD completos sin pérdidas.", AMBER),
        ("3. Multa del 10% y Puntos de Puntualidad", "Quien paga a tiempo acumula 'Puntos de Puntualidad (onTimeShares)'. Quien paga tarde abona una multa del 10% que nutre directamente el Pozo de Premios de los puntuales.", CYAN)
    ]
    for i, (e_t, e_d, e_c) in enumerate(eco_cards):
        box = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + i*3.95), Inches(1.8), Inches(3.75), Inches(3.3))
        box.fill.solid()
        box.fill.fore_color.rgb = CARD_BG
        box.line.color.rgb = e_c
        tf = box.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = e_t
        pt.font.size = Pt(13)
        pt.font.bold = True
        pt.font.color.rgb = e_c
        pd = tf.add_paragraph()
        pd.text = e_d
        pd.font.size = Pt(11)
        pd.font.color.rgb = TEXT_WHITE
        pd.space_before = Pt(10)

    # Formula Box
    f_bar = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(5.4), Inches(11.7), Inches(1.3))
    f_bar.fill.solid()
    f_bar.fill.fore_color.rgb = CARD_BG
    f_bar.line.color.rgb = INDIGO
    tf = f_bar.text_frame
    tf.word_wrap = True
    pt = tf.paragraphs[0]
    pt.text = "FÓRMULA DE REPARTO DE RENDIMIENTOS Y MULTAS AL CIERRE:"
    pt.font.size = Pt(10)
    pt.font.bold = True
    pt.font.color.rgb = INDIGO
    pd = tf.add_paragraph()
    pd.text = "Premio_i = (Rendimiento_Base_Vault + Suma_Multas_Morosos) × ( onTimeShares_i  /  Total_onTimeShares )"
    pd.font.size = Pt(13)
    pd.font.bold = True
    pd.font.color.rgb = EMERALD
    pd.space_before = Pt(4)

    # =========================================================================
    # SLIDE 7: REPUTACIÓN CREDITICIA ON-CHAIN (BERKELEY)
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_header(s7, "6. Inclusión Financiera", "Pasaporte de Reputación Descentralizada (Paper de UC Berkeley)")

    # Left: Score breakdown
    r1 = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(5.6), Inches(4.9))
    r1.fill.solid()
    r1.fill.fore_color.rgb = CARD_BG
    r1.line.color.rgb = INDIGO
    tf = r1.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "📊 Puntaje Crediticio Comunitario (100 a 1000)"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = INDIGO
    p2 = tf.add_paragraph()
    p2.text = (
        "Inspirado en el paper: 'Good Reputation: Expanding Access to Credit Leveraging Reputational and Social Network Data' (UC Berkeley).\n\n"
        "• Puntaje Base Inicial: 500 puntos\n"
        "• +25 pts por cada pago puntual registrado en la bóveda\n"
        "• +60 pts por cada círculo completado con récord limpio\n"
        "• -40 pts por cada pago extemporáneo en ventana de mora\n"
        "• -150 pts por incumplimiento cubierto con garantía (default)"
    )
    p2.font.size = Pt(11)
    p2.font.color.rgb = TEXT_WHITE
    p2.space_before = Pt(10)

    # Right: Social Vouching
    r2 = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(1.8), Inches(5.6), Inches(4.9))
    r2.fill.solid()
    r2.fill.fore_color.rgb = CARD_BG
    r2.line.color.rgb = EMERALD
    tf = r2.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "🤝 Respaldo de Red Social (Social Vouching)"
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = EMERALD
    p2 = tf.add_paragraph()
    p2.text = (
        "• En la economía popular, quien no tiene historial en centrales de riesgo (Datacrédito) depende de la confianza de su comunidad.\n\n"
        "• Función 'vouchForMember()': Miembros con excelente historial (score >= 500 y círculos limpios) pueden avalar socialmente a un familiar o vecino (+15 pts por aval, máx 90).\n\n"
        "• Protección Anti-Sybil: Cuentas nuevas o morosas no pueden emitir avales."
    )
    p2.font.size = Pt(11)
    p2.font.color.rgb = TEXT_WHITE
    p2.space_before = Pt(10)

    # =========================================================================
    # SLIDE 8: TESTING Y AUDITORÍA
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_header(s8, "7. Calidad & Seguridad", "Validación Formal y Batería de Pruebas Automatizadas")

    kpis = [
        ("29 / 29 PASS", "Tests en Solidity (Foundry)", "100% de pruebas unitarias e integrales exitosas en SavingsCircle.t.sol y SavingsCircleSecurity.t.sol.", EMERALD),
        ("256 RUNS", "Fuzzing de Permutaciones", "Pruebas probabilísticas aleatorias garantizando que ninguna combinación de turnos omita o duplique miembros.", CYAN),
        ("4 / 4 PASS", "Auditoría Off-Chain JS", "Scripts independientes en Node.js (draw.test.mjs) que verifican la evidencia del compromiso sin sesgo.", INDIGO)
    ]
    for i, (k_val, k_tit, k_desc, k_col) in enumerate(kpis):
        box = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + i*3.95), Inches(1.8), Inches(3.75), Inches(2.6))
        box.fill.solid()
        box.fill.fore_color.rgb = CARD_BG
        box.line.color.rgb = k_col
        tf = box.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = k_val
        pt.font.size = Pt(24)
        pt.font.bold = True
        pt.font.color.rgb = k_col
        pt2 = tf.add_paragraph()
        pt2.text = k_tit
        pt2.font.size = Pt(12)
        pt2.font.bold = True
        pt2.font.color.rgb = TEXT_WHITE
        pt2.space_before = Pt(4)
        pd = tf.add_paragraph()
        pd.text = k_desc
        pd.font.size = Pt(10)
        pd.font.color.rgb = TEXT_MUTED
        pd.space_before = Pt(6)

    # Audit Box
    a_bar = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.7), Inches(11.7), Inches(2.0))
    a_bar.fill.solid()
    a_bar.fill.fore_color.rgb = CARD_BG
    a_bar.line.color.rgb = EMERALD
    tf = a_bar.text_frame
    tf.word_wrap = True
    pt = tf.paragraphs[0]
    pt.text = "ESCENARIOS DE ATAQUE AUDITADOS Y BLINDADOS:"
    pt.font.size = Pt(11)
    pt.font.bold = True
    pt.font.color.rgb = EMERALD
    pd = tf.add_paragraph()
    pd.text = (
        "✔ Front-running al inscribirse: Bloqueado por separación de compromiso y oráculo.\n"
        "✔ Cancelación en círculo activo: Prohibida una vez solicitada la aleatoriedad.\n"
        "✔ Manipulación del tiempo: Contratos anclados exclusivamente a block.timestamp.\n"
        "✔ Desbalanceo del pozo: La garantía siempre cubre la cuota y la multa en todos los casos."
    )
    pd.font.size = Pt(10.5)
    pd.font.color.rgb = TEXT_WHITE
    pd.space_before = Pt(6)

    # =========================================================================
    # SLIDE 9: DEMO EN VIVO Y CONCLUSIONES
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    set_slide_background(s9)
    add_header(s9, "8. Demostración en Vivo", "Pase a la DApp Interactiva (http://localhost:3000)")

    demo_steps = [
        ("1. Sorteo Verificable", "Inscribir miembros con 1-Click y auditar en pantalla el Hash de Compromiso y la asignación de turnos.", EMERALD),
        ("2. Pago Puntual vs Mora", "Pagar a tiempo (+Score), saltar a la ventana de mora, cobrar recargo del 10% y castigar la reputación.", AMBER),
        ("3. Ejecución de Garantía", "Simular el impago de un miembro: su colateral absorbe la deuda y el ganador del turno cobra intacto.", CYAN)
    ]
    for i, (d_tit, d_desc, d_col) in enumerate(demo_steps):
        box = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + i*3.95), Inches(1.8), Inches(3.75), Inches(2.6))
        box.fill.solid()
        box.fill.fore_color.rgb = CARD_BG
        box.line.color.rgb = d_col
        tf = box.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = d_tit
        pt.font.size = Pt(14)
        pt.font.bold = True
        pt.font.color.rgb = d_col
        pd = tf.add_paragraph()
        pd.text = d_desc
        pd.font.size = Pt(11)
        pd.font.color.rgb = TEXT_WHITE
        pd.space_before = Pt(8)

    # Conclusion Banner
    c_bar = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.7), Inches(11.7), Inches(2.0))
    c_bar.fill.solid()
    c_bar.fill.fore_color.rgb = CARD_BG
    c_bar.line.color.rgb = INDIGO
    tf = c_bar.text_frame
    tf.word_wrap = True
    pt = tf.paragraphs[0]
    pt.text = "CONCLUSIÓN DEL PROYECTO:"
    pt.font.size = Pt(11)
    pt.font.bold = True
    pt.font.color.rgb = INDIGO
    pd = tf.add_paragraph()
    pd.text = (
        "NatiChain demuestra cómo la tecnología Blockchain puede transformar prácticas financieras comunitarias tradicionales (natilleras y cadenas) "
        "en protocolos seguros, matemáticamente justos y programables, protegiendo los ahorros de las personas sin intermediarios bancarios ni riesgos de apropiación."
    )
    pd.font.size = Pt(11.5)
    pd.font.color.rgb = TEXT_WHITE
    pd.space_before = Pt(6)

    output_path = "NatiChain_Presentacion.pptx"
    prs.save(output_path)
    print(f"Presentation saved successfully to {output_path}")

if __name__ == "__main__":
    create_deck()
