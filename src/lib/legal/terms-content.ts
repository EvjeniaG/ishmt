import {
  INSTITUTION_ACRONYM,
  INSTITUTION_FULL_NAME,
  INSTITUTION_REGISTRY_TITLE,
} from "@/lib/constants/institution";

export type LegalAct = {
  citation: string;
  title: string;
  summary: string;
  href?: string;
};

export type TermsSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  legalActs?: LegalAct[];
};

export const TERMS_LAST_UPDATED = "19 gusht 2026";
export const TERMS_CONTACT_EMAIL = "info@ishmt.gov.al";

/** Aktet normative që formojnë bazën ligjore të mbikëqyrjes së ashensorëve dhe të IQMT-së. */
export const LEGAL_BASIS_ACTS: LegalAct[] = [
  {
    citation: "Ligji Nr. 10489, datë 15.12.2011",
    title: "Për tregtimin dhe mbikëqyrjen e tregut të produkteve joushqimore (i ndryshuar)",
    summary:
      "Ligji primar mbi të cilin mbështetet i gjithë kuadri i ashensorëve. Çdo ashensor trajtohet si «produkt joushqimor i vënë në shërbim» dhe i nënshtrohet inspektimit të Inspektoratit të Mbikëqyrjes së Tregut.",
    href: "https://infrastruktura.gov.al/wp-content/uploads/2017/10/Ligji_baze_nr_10489_dt_15122011.pdf",
  },
  {
    citation: "Ligji Nr. 10480, datë 17.11.2011",
    title: "Për sigurinë e përgjithshme të produkteve joushqimore (i ndryshuar)",
    summary:
      "Vendos detyrimin e sigurisë për produktet dhe instalimet në përdorim. Plotëson Ligjin nr. 10489 dhe stanon bazën e detyrimeve për mirëmbajtjen dhe kontrollin periodik.",
    href: "https://www.infrastruktura.gov.al/ligje-industrial/",
  },
  {
    citation: "Ligji Nr. 10433, datë 16.06.2011",
    title: "Për inspektimin në Republikën e Shqipërisë",
    summary:
      "Përcakton kuadrin e përgjithshëm procedural të inspektimeve shtetërore. Mbi bazën e këtij ligji u krijua Inspektorati Shtetëror i Mbikëqyrjes së Tregut dhe ushtrohen kompetencat inspektuese.",
    href: "https://akm.gov.al/en/ova_doc/ligj-10433-2011-per-inspektimin-ne-republiken-e-shqiperise/",
  },
  {
    citation: "Ligji Nr. 116/2014, datë 11.09.2014",
    title: "Për akreditimin e organeve të vlerësimit të konformitetit",
    summary:
      "Rregullon organet e vlerësimit të konformitetit që lëshojnë certifikatat dhe dokumentacionin teknik të ashensorëve (organet OM / certifikuese).",
    href: "https://www.infrastruktura.gov.al/ligje-industrial/",
  },
  {
    citation: "VKM Nr. 1056, datë 23.12.2015",
    title: "Për miratimin e rregullit teknik për sigurinë e ashensorëve në përdorim",
    summary:
      "Vendos detyrimet e personave përgjegjës dhe administratorëve për mirëmbajtjen dhe kontrollin periodik të ashensorëve ekzistues.",
    href: "https://www.infrastruktura.gov.al/ligje-industrial/",
  },
  {
    citation: "VKM Nr. 1057, datë 23.12.2015",
    title: "Për miratimin e rregullit teknik për ashensorët",
    summary:
      "Miraton rregullin teknik për projektimin, instalimin dhe vlerësimin e konformitetit të ashensorëve të rinj.",
    href: "https://www.infrastruktura.gov.al/ligje-industrial/",
  },
  {
    citation: "VKM Nr. 91, datë 27.01.2009",
    title:
      "Për miratimin e rregullit teknik për kërkesat thelbësore dhe vlerësimin e konformitetit të ashensorëve",
    summary:
      "Përcakton kërkesat thelbësore të sigurisë dhe procedurat e vlerësimit të konformitetit; zbatohet edhe për platformat dhe shkallët lëvizëse.",
    href: "https://www.infrastruktura.gov.al/ligje-industrial/",
  },
  {
    citation: "VKM Nr. 36, datë 20.01.2016",
    title:
      "Për krijimin, organizimin dhe funksionimin e Inspektoratit Shtetëror të Mbikëqyrjes së Tregut",
    summary:
      "Akti themelues i ISHMT-së (sot IQMT), që përcakton krijimin, organizimin dhe funksionimin e autoritetit të mbikëqyrjes së tregut.",
    href: "https://ishmt.gov.al/wp-content/uploads/2022/04/VKM_Nr.36_date_20.01.2016-Per-krijimin-organizimin-dhe-funksionimin-e-inspektoriatit-shteteror-te-mbikeqyrjes-se-tregut.pdf",
  },
  {
    citation: "Udhëzimi Nr. 1, datë 05.03.2026",
    title:
      "Për procedurën e regjistrimit, çregjistrimit, ndryshimit dhe përditësimit të të dhënave, si dhe administrimin e regjistrave të ashensorëve pranë ISHMT",
    summary:
      "Akti nënligjor që rregullon procedurat e regjistrimit dixhital, dokumentacionin, rolet e palëve dhe administrimin e regjistrave të ashensorëve - baza e drejtpërdrejtë e kësaj platforme.",
  },
];

export const TERMS_PAGE = {
  title: "Termat dhe Kushtet e Përdorimit",
  subtitle: INSTITUTION_REGISTRY_TITLE,
  intro: [
    `${INSTITUTION_FULL_NAME} (${INSTITUTION_ACRONYM}) administron platformën dixhitale të Regjistrit të Ashensorëve, si pikë qasjeje elektronike për shërbime publike në fushën e instalimit, certifikimit, mirëmbajtjes dhe inspektimit të ashensorëve.`,
    "Platforma ushtrohet në kuadër të kompetencave të Inspektoratit të Mbikëqyrjes së Tregut, të vendosura me ligj dhe akte nënligjore. Përdorimi i saj nënkupton respektimin e kornizës ligjore të ashensorëve si «produkte joushqimore të vëna në shërbim».",
    "Ju lutemi lexoni me kujdes këto Terma dhe Kushte para regjistrimit, hyrjes në sistem ose përdorimit të shërbimeve. Vazhdimi i përdorimit nënkupton pranimin tuaj të plotë.",
  ],
  sections: [
    {
      id: "perkufizime",
      title: "1. Përkufizime",
      paragraphs: ["Në këto Terma dhe Kushte:"],
      bullets: [
        `«Platforma» - sistemi informatik «${INSTITUTION_REGISTRY_TITLE}», i aksesueshëm nëpërmjet internetit.`,
        `«${INSTITUTION_ACRONYM}» / «Inspektorati» - ${INSTITUTION_FULL_NAME}, autoriteti shtetëror i mbikëqyrjes së tregut, trashëgimës i funksioneve të ISHMT-së sipas legjislacionit në fuqi.`,
        "«Përdorues» - çdo person fizik ose subjekt juridik që regjistron llogari, hyn në sistem ose përdor shërbimet e platformës.",
        "«Llogari» - profili i krijuar nga përdoruesi me identifikues unik (Numër Personal ose NIPT) dhe kredenciale të sigurta.",
        "«Ashensor» - instalim i liftit, platformës ose shkallës lëvizëse, i trajtuar si produkt joushqimor i vënë në shërbim, në kuptim të Ligjit nr. 10489.",
        "«Shërbimet» - veprimtaritë dixhitale të ofruara përmes platformës: regjistrim, çregjistrim, ndryshim ose përditësim të të dhënave, menaxhim aplikimesh, kontratash, inspektimesh dhe dokumentacionit përkatës.",
        "«Drejtoria e Politikave» - institucioni përgjegjës për regjistrimin dhe licencimin e subjekteve ekonomike relevante.",
        "«Organi i vlerësimit të konformitetit (OM)» - subjekt i akredituar që kryen vlerësimin e konformitetit dhe inspektimin periodik, sipas Ligjit nr. 116/2014.",
      ],
    },
    {
      id: "baza-ligjore",
      title: "2. Baza ligjore",
      paragraphs: [
        "Kjo platformë dhe shërbimet e saj administrohen nga IQMT në ushtrimin e kompetencave të mbikëqyrjes së tregut të produkteve joushqimore, përfshirë ashensorët si produkte të vëna në shërbim.",
        "Marrëdhëniet ligjore midis palëve, detyrimet e sigurisë, inspektimet dhe procedurat e regjistrimit rregullohen, ndër të tjera, nga aktet e mëposhtme normative:",
      ],
      legalActs: LEGAL_BASIS_ACTS,
    },
    {
      id: "pranimi",
      title: "3. Pranimi i kushteve",
      paragraphs: [
        "Duke klikuar «Regjistrohu», «Hyr në sistem» ose duke vazhduar përdorimin e platformës, ju konfirmoni se keni lexuar, kuptuar dhe pranuar këto Terma dhe Kushte, si dhe se jeni të vetëdijshëm për detyrimet që rrjedhin nga legjislacioni i cituar në seksionin «Baza ligjore».",
        "Nëse nuk pajtoheni me ndonjë dispozitë, nuk duhet të përdorni platformën.",
        "Për shërbime specifike mund të kërkohen edhe deklarata ose autorizime shtesë, të cilat plotësojnë këto Terma dhe Kushte.",
      ],
    },
    {
      id: "qasja",
      title: "4. Qasja, regjistrimi dhe siguria e llogarisë",
      paragraphs: [
        "Qasja kërkon regjistrim me të dhëna të vërteta dhe të plota. Personat fizikë identifikohen me Numrin Personal; subjektet ekonomike me NIPT.",
        "Përdoruesi është përgjegjës për ruajtjen e konfidencialitetit të kredencialeve dhe për çdo veprim të kryer përmes llogarisë së tij.",
        "IQMT mund të kërkojë verifikim shtesë, validim nga regjistrat shtetërorë (p.sh. QKB) ose autorizim nga Drejtoria e Politikave, para aktivizimit të plotë të llogarisë.",
        "IQMT rezervon të drejtën të refuzojë, pezullojë ose çaktivizojë llogarinë kur ka dyshime për shkelje të kushteve, paraqitje të të dhënave të rreme ose kërkesë nga autoritetet kompetente.",
      ],
    },
    {
      id: "perdorimi",
      title: "5. Përdorimi i lejuar i platformës",
      paragraphs: [
        "Platforma shërben për procese zyrtare të regjistrave të ashensorëve dhe mbikëqyrjes së tregut, në përputhje me Udhëzimin nr. 1 dhe aktet e tjera të cituara në seksionin «Baza ligjore». Përdoruesi duhet ta përdorë vetëm për qëllime ligjore.",
      ],
      bullets: [
        "Paraqitja dhe përditësimi i aplikimeve për regjistrim, çregjistrim, ndryshim ose modernizim të ashensorëve.",
        "Plotësimi i dokumentacionit teknik, kontratave të mirëmbajtjes dhe kontratave të kontrollit periodik.",
        "Ndjekja e statusit të dosjeve, inspektimeve, certifikimeve dhe detyrimeve periodike.",
        "Komunikimi zyrtar midis personave përgjegjës, kompanive të licencuara, organeve OM dhe stafit të autorizuar të IQMT-së.",
        "Verifikimi i informacionit të regjistrit publik, ku ofrohet si shërbim.",
      ],
    },
    {
      id: "ndalimet",
      title: "6. Veprimtaritë e ndaluara",
      paragraphs: ["Është ndaluar expressis verbis:"],
      bullets: [
        "Përdorimi i platformës për qëllime të paligjshme, mashtruese ose që cenojnë të drejtat e palëve të treta.",
        "Paraqitja e të dhënave të rreme, të pasakta ose të manipuluara në regjistër apo në aplikime.",
        "Përpjekjet për të hyrë pa autorizim, për të anashkaluar kontrollet e sigurisë ose për të dëmtuar funksionimin e platformës.",
        "Riprodhimi, shpërndarja ose shfrytëzimi komercial i përmbajtjes së platformës pa leje me shkrim nga IQMT.",
        "Përdorimi i llogarisë nga persona të paautorizuar ose transferimi i kredencialeve te palë të treta.",
        "Ushtrimi i funksioneve (instalim, mirëmbajtje, OM) pa licencë ose autorizim të vlefshëm, kur kjo kërkohet me ligj.",
      ],
    },
    {
      id: "detyrimet",
      title: "7. Detyrimet e përdoruesit",
      paragraphs: [
        "Përdoruesi garanton se informacioni i dhënë është i saktë, i plotë dhe i përditësuar.",
        "Personi përgjegjës i ashensorit ka detyrime të drejtpërdrehta për mirëmbajtjen, kontrollin periodik dhe sigurinë e instalimit, sipas VKM nr. 1056 dhe akteve nënligjore.",
        "Subjektet ekonomike janë përgjegjëse që personeli i autorizuar të veprojë vetëm brenda funksioneve dhe licencave të regjistruara.",
        "Përdoruesi duhet të njoftojë menjëherë IQMT-në në rast humbjeje të kredencialeve, aksesi të paautorizuar ose dyshimi për shkelje sigurie.",
        "Respektimi i afateve ligjore dhe i detyrimeve të dokumentacionit mbetet përgjegjësi e palëve, edhe kur platforma ofron njoftime kujtese.",
      ],
    },
    {
      id: "te-dhenat",
      title: "8. Të dhënat personale dhe regjistrat",
      paragraphs: [
        "Përpunimi i të dhënave personale kryhet në përputhje me legjislacionin shqiptar për mbrojtjen e të dhënave personale dhe me qëllimin e ofrimit të shërbimeve publike.",
        "Të dhënat e përdoruesve mund të verifikohen nga regjistrat dhe sistemet shtetërore të institucioneve që i administrojnë, kur kjo kërkohet për verifikim ose plotësim automatik të formularëve.",
        "IQMT mbledh dhe përpunon vetëm të dhënat e nevojshme për regjistrim, shqyrtim, miratim, mbikëqyrje dhe auditim të proceseve të regjistrit të ashensorëve.",
        `Për kërkesa në lidhje me të dhënat personale: ${TERMS_CONTACT_EMAIL}.`,
      ],
    },
    {
      id: "dokumentet",
      title: "9. Dokumentet dhe vlera ligjore",
      paragraphs: [
        "Dokumentet dhe njoftimet e gjeneruara përmes platformës, kur identifikohen si zyrtare sipas kornizës ligjore, kanë vlerën e përcaktuar nga ligji për dokumentet dhe nënshkrimet elektronike.",
        "Përdoruesi është përgjegjës për verifikimin e saktësisë së të dhënave para parashtrimit përfundimtar të aplikimeve.",
        "IQMT mund të kërkojë dokumentacion origjinal ose verifikim shtesë kur e parashikon procedura ose rregullorja.",
      ],
    },
    {
      id: "disponueshmeria",
      title: "10. Disponueshmëria e shërbimit",
      paragraphs: [
        "Platforma ofrohet me përpjekje për disponueshmëri të vazhdueshme. IQMT nuk garanton funksionim pa ndërprerje dhe mund të kryejë mirëmbajtje, përditësime ose ndërprerje të planifikuara.",
        "IQMT nuk mban përgjegjësi për vonesa ose dështime të shkaktuara nga force majeure, probleme rrjeti, palë të treta ose sisteme të jashtme.",
        "Njoftimet për ndërprerje të planifikuara, kur është e mundur, publikohen në platformë ose në kanalet zyrtare të IQMT-së.",
      ],
    },
    {
      id: "pronesia",
      title: "11. Pronësia intelektuale",
      paragraphs: [
        "Platforma, dizajni, logot, teksti, softueri dhe përmbajtja e strukturuar janë pronë e IQMT-së ose e palëve të licencuara dhe mbrohen nga legjislacioni përkatës.",
        "Përdoruesit marrin një të drejtë të kufizuar, jo-ekskluzive dhe të pakalueshme për të përdorur platformën sipas këtyre kushteve.",
      ],
    },
    {
      id: "pergjegjesia",
      title: "12. Kufizimi i përgjegjësisë",
      paragraphs: [
        "IQMT nuk mban përgjegjësi për dëme indirekte, humbje fitimi ose pasaktësi që rrjedhin nga të dhënat e paraqitura nga përdoruesit ose palët e treta, përveç rasteve kur ligji e parashikon ndryshe.",
        "Përgjegjësia e IQMT-së për përdorimin e platformës kufizohet në masën e lejuar nga legjislacioni në fuqi.",
      ],
    },
    {
      id: "ndryshimet",
      title: "13. Ndryshimet e termave",
      paragraphs: [
        "IQMT mund të përditësojë këto Terma dhe Kushte. Versioni i përditësuar publikohet në këtë faqe me datën e hyrjes në fuqi.",
        "Ndryshimet materiale do të theksohen në platformë. Vazhdimi i përdorimit pas publikimit nënkupton pranimin e kushteve të reja.",
      ],
    },
    {
      id: "ligji",
      title: "14. Ligji zbatues dhe zgjidhja e mosmarrëveshjeve",
      paragraphs: [
        "Këto Terma dhe Kushte, si dhe marrëdhëniet e krijuara nga përdorimi i platformës, rregullohen nga ligjet e Republikës së Shqipërisë, duke përfshirë aktet e cituara në seksionin «Baza ligjore».",
        "Mosmarrëveshjet që nuk zgjidhen me mirëkuptim i nënshtrohen juridiksionit të gjykatave kompetente të Republikës së Shqipërisë.",
      ],
    },
    {
      id: "kontakti",
      title: "15. Kontakti",
      paragraphs: [
        `Për pyetje, ankesa ose sqarime në lidhje me këto Terma dhe Kushte, kontaktoni ${INSTITUTION_FULL_NAME} (${INSTITUTION_ACRONYM}): ${TERMS_CONTACT_EMAIL}.`,
        "Adresa: Rruga «Shyqyri Bërxolli» Nr. 65, Tiranë, Republika e Shqipërisë.",
        "Faqja zyrtare: ishmt.gov.al",
      ],
    },
  ] satisfies TermsSection[],
} as const;
