-- Seed: PARTALEN (Part Group → Pontonen Mjölkudden) — 7 discipliner + 8 faser + 39 leverabler
-- Källa: PM Cloud src/lib/pm-cloud/instanceConfig.ts (partGroupDeliverables/Phases)

do $$
declare
  v_project_id uuid;
  v_pl_id uuid; v_a_id uuid; v_k_id uuid; v_vvs_id uuid; v_el_id uuid; v_brand_id uuid; v_energi_id uuid;
  v_p0 uuid; v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid; v_p5 uuid; v_p6 uuid; v_p7 uuid;
begin
  select p.id into v_project_id
  from public.gf_projects p
  join public.gf_organizations o on o.id = p.org_id
  where o.slug = 'part-group' and p.slug = 'partalen';

  if v_project_id is null then
    raise exception 'Projektet part-group/partalen finns inte i gf_projects';
  end if;

  -- ===== Discipliner =====
  insert into public.pm_disciplines (project_id, code, name, color, sort_order) values
    (v_project_id, 'PL',    'Projektledning', '#1E3A8A', 1),
    (v_project_id, 'A',     'Arkitektur',     '#F59E0B', 2),
    (v_project_id, 'K',     'Konstruktion',   '#0EA5E9', 3),
    (v_project_id, 'VVS',   'VVS',            '#10B981', 4),
    (v_project_id, 'EL',    'El',             '#EAB308', 5),
    (v_project_id, 'BRAND', 'Brand',          '#EF4444', 6),
    (v_project_id, 'ENERGI','Energi',         '#8B5CF6', 7)
  on conflict (project_id, code) do nothing;

  select id into v_pl_id     from public.pm_disciplines where project_id = v_project_id and code = 'PL';
  select id into v_a_id      from public.pm_disciplines where project_id = v_project_id and code = 'A';
  select id into v_k_id      from public.pm_disciplines where project_id = v_project_id and code = 'K';
  select id into v_vvs_id    from public.pm_disciplines where project_id = v_project_id and code = 'VVS';
  select id into v_el_id     from public.pm_disciplines where project_id = v_project_id and code = 'EL';
  select id into v_brand_id  from public.pm_disciplines where project_id = v_project_id and code = 'BRAND';
  select id into v_energi_id from public.pm_disciplines where project_id = v_project_id and code = 'ENERGI';

  -- ===== Faser =====
  insert into public.pm_phases (project_id, stage, name, description, status, progress, completion_date, key_activities, sort_order) values
    (v_project_id, '0', 'Förstudie',                 'Behov, förutsättningar & genomförbarhet',         'completed', 100, '2025-06-30', array['Marknadsanalys hotell Luleå','Platsutvärdering Mjölkudden','Konceptutveckling 4 byggnadsdelar','Budgetram & tidplan'], 0),
    (v_project_id, '1', 'Program & organisation',    'Kravspecifikation & projekteringsuppdrag',        'completed', 100, '2025-10-31', array['Rumsprogram alla byggnadsdelar','Upphandling konsulter','Geoteknisk undersökning','Detaljplaneanalys'], 1),
    (v_project_id, '2', 'Systemhandling',            'Samordnad projektering & bygglov',                'current',    60, '2026-04-30', array['Arkitektur — planlösningar & fasader','Konstruktion — stomme & grundläggning','VVS/El — systemval','BIM-samordning'], 2),
    (v_project_id, '3', 'Bygghandling',              'Detaljprojektering & förfrågningsunderlag',       'upcoming',    0, '2026-08-15', array['Detaljprojektering alla discipliner','Förfrågningsunderlag entreprenad','Materialspecifikationer'], 3),
    (v_project_id, '4', 'Produktion — Mark & grund', 'Markarbeten, VA & grundläggning',                 'upcoming',    0, '2026-11-01', array['Markarbeten & schakt','Pålning & grundläggning','VA-ledningar & dagvatten'], 4),
    (v_project_id, '5', 'Produktion — Stomme & modul','Modulmontering, stomme & skal',                  'upcoming',    0, '2027-09-01', array['Modulmontering Hus C (Isolamin)','Stommontage Hus A/L/B','Klimatskal & fasader'], 5),
    (v_project_id, '6', 'Färdigställande & inredning','Invändigt, utrustning & hotellmöblering',        'upcoming',    0, '2028-11-01', array['Invändig komplettering','Hotellmöblering Hus A','Driftsättning installationer','Slutbesiktning'], 6),
    (v_project_id, '7', 'Överlämning & drift',       'Inflyttning & garantiperiod',                     'upcoming',    0, '2029-06-01', array['Inflyttning Hus C','Hotelldrift Hus A igång','Garantibesiktningar','Erfarenhetsåterföring'], 7)
  on conflict (project_id, stage) do nothing;

  select id into v_p0 from public.pm_phases where project_id = v_project_id and stage = '0';
  select id into v_p1 from public.pm_phases where project_id = v_project_id and stage = '1';
  select id into v_p2 from public.pm_phases where project_id = v_project_id and stage = '2';
  select id into v_p3 from public.pm_phases where project_id = v_project_id and stage = '3';
  select id into v_p4 from public.pm_phases where project_id = v_project_id and stage = '4';
  select id into v_p5 from public.pm_phases where project_id = v_project_id and stage = '5';
  select id into v_p6 from public.pm_phases where project_id = v_project_id and stage = '6';
  select id into v_p7 from public.pm_phases where project_id = v_project_id and stage = '7';

  -- ===== Leverabler (D001-D039) =====
  insert into public.pm_deliverables (project_id, code, name, description, phase_id, discipline_id, status, format, information_content, responsible, due_date, sort_order) values
    (v_project_id, 'D001', 'Förstudierapport',                  'Övergripande förstudierapport med marknadsanalys och konceptutveckling',         v_p0, v_pl_id,    'klar',         'PDF',       array['Marknadsanalys hotellmarknad Luleå','Platsutvärdering Mjölkudden','Konceptutveckling 4 byggnadsdelar','Preliminär riskbedömning'], 'Kent Karlsson',           '2025-06-30',  1),
    (v_project_id, 'D002', 'Marknadsanalys',                    'Analys av hotellmarknaden i Luleå och behov av kontor/bostäder',                  v_p0, v_pl_id,    'klar',         'PDF',       array['Beläggningsgrad hotell Luleå','Konkurrensanalys','Efterfrågan kontor/bostad','Prisnivåer och hyresintäkter'], 'Kent Karlsson',           '2025-05-15',  2),
    (v_project_id, 'D003', 'Konceptskisser',                    'Tidiga konceptskisser för samtliga byggnadsdelar',                                v_p0, v_a_id,     'klar',         'DWG/PDF',   array['Volymstudie Hus A/L/B/C','Principiella planlösningar','Fasaduttryck','Situationsplan'], 'Arkitekt (konsult)',         '2025-06-15',  3),
    (v_project_id, 'D004', 'Preliminär budget',                 'Översiktlig kostnadsuppskattning för hela projektet',                             v_p0, v_pl_id,    'klar',         'Excel',     array['Budgetram per byggnadsdel','Markförvärv','Projekteringskostnader','Reserv och osäkerhet'], 'Kent Karlsson',           '2025-06-30',  4),
    (v_project_id, 'D005', 'Programhandling',                   'Komplett programhandling med rumsprogram för alla byggnadsdelar',                 v_p1, v_a_id,     'klar',         'PDF',       array['Rumsprogram Hus A (hotell 200 rum)','Rumsprogram Länken (restaurang/konferens)','Rumsprogram Hus B (kontor)','Rumsprogram Hus C (72 lägenheter)','Ytsammanställning'], 'Arkitekt (konsult)', '2025-09-30',  5),
    (v_project_id, 'D006', 'Konsultavtal',                      'Avtal med samtliga projekteringskonsulter',                                       v_p1, v_pl_id,    'klar',         'PDF',       array['A-konsult','K-konsult','VVS-konsult','El-konsult','Brandkonsult','Geoteknisk konsult'], 'Kent Karlsson',                  '2025-08-31',  6),
    (v_project_id, 'D007', 'Geoteknisk rapport',                'Geoteknisk undersökning av Mjölkudden-tomten',                                    v_p1, v_k_id,     'klar',         'PDF',       array['Borrprotokoll','Jordlagerföljd','Grundläggningsrekommendation','Sättningsberäkningar'], 'K-konsult',                          '2025-09-15',  7),
    (v_project_id, 'D008', 'Projektorganisationsplan',          'Organisation, roller och ansvar',                                                 v_p1, v_pl_id,    'klar',         'PDF',       array['Organisationsschema','Rollbeskrivningar','Mötesstruktur','Kommunikationsplan'], 'Kent Karlsson',                          '2025-10-15',  8),
    (v_project_id, 'D009', 'Budget- & tidplanbekräftelse',      'Bekräftad budget och övergripande tidplan',                                       v_p1, v_pl_id,    'klar',         'Excel/PDF', array['Budget per disciplin','Huvudtidplan','Betalningsplan','Beslutsunderlag styrelse'], 'Kent Karlsson',                       '2025-10-31',  9),
    (v_project_id, 'D010', 'Systemhandlingsritningar A',        'Arkitektritningar systemhandlingsskede',                                          v_p2, v_a_id,     'pagaende',     'DWG/BIM',   array['Planlösningar alla plan','Fasader alla väderstreck','Sektioner','Rumsdetaljer hotellrum','Materialval fasad'], 'Arkitekt (konsult)',          '2026-04-15', 10),
    (v_project_id, 'D011', 'Systemhandlingsritningar K',        'Konstruktionsritningar systemhandlingsskede',                                     v_p2, v_k_id,     'pagaende',     'DWG/BIM',   array['Stomme och bärande system','Grundläggningsplan','Pålplan','Håltagningsritningar','Dimensionerande laster'], 'K-konsult',                       '2026-04-15', 11),
    (v_project_id, 'D012', 'Bygglovshandlingar',                'Handlingar för bygglovsansökan',                                                  v_p2, v_a_id,     'pagaende',     'PDF',       array['Situationsplan','Fasadritningar','Planritningar','Sektioner','Tillgänglighetsutlåtande'], 'Arkitekt (konsult)',                   '2026-03-31', 12),
    (v_project_id, 'D013', 'Energiberäkning',                   'Energiberäkning enligt BBR',                                                      v_p2, v_energi_id,'pagaende',     'PDF',       array['U-värden klimatskal','Energibalansberäkning','Miljöklassning','LCC-kalkyl energisystem'], 'Energikonsult',                       '2026-04-01', 13),
    (v_project_id, 'D014', 'Brandskyddsbeskrivning',            'Brandskyddsdokumentation systemhandling',                                         v_p2, v_brand_id, 'pagaende',     'PDF',       array['Brandcellsindelning','Utrymningsvägar','Sprinklersystem','Brandteknisk klass bärande stomme','Räddningsvägar'], 'Brandkonsult',                '2026-03-31', 14),
    (v_project_id, 'D015', 'VVS-systemhandling',                'VVS-projektering systemhandlingsskede',                                           v_p2, v_vvs_id,   'pagaende',     'DWG/BIM',   array['Ventilationssystemval','Värmesystem','Tappvatten hotell','Kylsystem','Energiåtervinning'], 'VVS-konsult',                         '2026-04-15', 15),
    (v_project_id, 'D016', 'El-systemhandling',                 'El-projektering systemhandlingsskede',                                            v_p2, v_el_id,    'pagaende',     'DWG/BIM',   array['Elförsörjning och ställverk','Belysningssystem','Styrning och reglering','Hissystem','Reservkraft'], 'El-konsult',                  '2026-04-15', 16),
    (v_project_id, 'D017', 'Kostnadskalkyl',                    'Uppdaterad kostnadskalkyl baserad på systemhandling',                             v_p2, v_pl_id,    'ej-paborjad',  'Excel',     array['Budget per disciplin','Entreprenadkostnad per byggnadsdel','Osäkerhetsmarginal','Jämförelse mot programskede'], 'Kent Karlsson',                  '2026-04-30', 17),
    (v_project_id, 'D018', 'BIM-samordningsmodell',             'Samordnad BIM-modell alla discipliner',                                           v_p2, v_pl_id,    'pagaende',     'IFC/BIM',   array['Samordnad 3D-modell','Kollisionskontrollrapport','Koordineringsprotokoll','Modellstatus per disciplin'], 'BIM-samordnare',                   '2026-04-30', 18),
    (v_project_id, 'D019', 'Bygghandlingsritningar A',          'Detaljerade arkitektritningar för produktion',                                    v_p3, v_a_id,     'ej-paborjad',  'DWG/BIM',   array['Detaljritningar','Rumsbeskrivningar','Materialspecifikationer','Inredningsritningar hotell'], 'Arkitekt (konsult)',                  '2026-07-31', 19),
    (v_project_id, 'D020', 'Bygghandlingsritningar K',          'Detaljerade konstruktionsritningar',                                              v_p3, v_k_id,     'ej-paborjad',  'DWG/BIM',   array['Armeringsritningar','Stålkonstruktionsritningar','Montageritningar','Tillverkningsritningar modul'], 'K-konsult',                    '2026-07-31', 20),
    (v_project_id, 'D021', 'Förfrågningsunderlag',              'Komplett förfrågningsunderlag för entreprenadupphandling',                        v_p3, v_pl_id,    'ej-paborjad',  'PDF/Excel', array['Administrativa föreskrifter','Tekniska beskrivningar','Ritningsförteckning','Mängdförteckning'], 'Kent Karlsson',                    '2026-08-15', 21),
    (v_project_id, 'D022', 'Tekniska beskrivningar',            'Tekniska beskrivningar alla installationer',                                      v_p3, v_pl_id,    'ej-paborjad',  'PDF',       array['VVS-beskrivning','El-beskrivning','Styr-beskrivning','Hissbeskrivning'], 'Respektive konsult',                          '2026-08-01', 22),
    (v_project_id, 'D023', 'Modulspecifikation Isolamin',       'Specifikation för modulproduktion Hus C',                                         v_p3, v_k_id,     'ej-paborjad',  'PDF/DWG',   array['Modulindelning','Tillverkningsritningar','Transportplan','Montagesekvens'], 'Isolamin + K-konsult',                       '2026-07-15', 23),
    (v_project_id, 'D024', 'Färdig grund alla hus',             'Grundläggning klara för samtliga byggnadsdelar',                                  v_p4, v_k_id,     'ej-paborjad',  'Rapport',   array['Pålningsprotokoll','Grundplattor gjutna','Tätskikt grund','Kvalitetsdokumentation'], 'Entreprenör',                              '2026-11-01', 24),
    (v_project_id, 'D025', 'VA-anslutningar klara',             'VA-ledningar och dagvattenhantering',                                             v_p4, v_vvs_id,   'ej-paborjad',  'Rapport',   array['VA-ledningar anslutna','Dagvattenhantering','Provtrycksprotokoll','Inmätning ledningar'], 'VA-entreprenör',                          '2026-10-15', 25),
    (v_project_id, 'D026', 'Relationshandlingar mark',          'As-built dokumentation markarbeten',                                              v_p4, v_pl_id,    'ej-paborjad',  'DWG/PDF',   array['Inmätningsdata','Ledningskarta','Markprofiler','Geotekniska kontrollprotokoll'], 'Markentreprenör',                                '2026-11-01', 26),
    (v_project_id, 'D027', 'Stomme färdig alla hus',            'Bärande stomme monterad för alla byggnader',                                      v_p5, v_k_id,     'ej-paborjad',  'Rapport',   array['Stomkontrollprotokoll','Svetsprotokoll','Toleranskontroll','Provbelastning'], 'Stommeentreprenör',                                 '2027-06-01', 27),
    (v_project_id, 'D028', 'Moduler monterade Hus C',           'Isolamin-moduler monterade i Hus C',                                              v_p5, v_k_id,     'ej-paborjad',  'Rapport',   array['Fabrikskontrollprotokoll','Transportdokumentation','Montageprotokoll','Täthetsprovning'], 'Isolamin',                                  '2027-04-01', 28),
    (v_project_id, 'D029', 'Klimatskal tätt',                   'Fasader och tak tätade på alla byggnader',                                        v_p5, v_a_id,     'ej-paborjad',  'Rapport',   array['Fasadmontageprotokoll','Fönstermontageprotokoll','Täthetsprovning','Fuktmätning'], 'Fasadentreprenör',                              '2027-08-01', 29),
    (v_project_id, 'D030', 'Installationsprotokoll',            'Protokoll för pågående installationsarbeten',                                     v_p5, v_vvs_id,   'ej-paborjad',  'Rapport',   array['VVS-installationsprotokoll','El-installationsprotokoll','Injusteringsprotokoll','Provdrift'], 'Installationsentreprenör',                  '2027-09-01', 30),
    (v_project_id, 'D031', 'Färdigställda lägenheter',          'Lägenheter i Hus C färdigställda',                                                v_p6, v_a_id,     'ej-paborjad',  'Rapport',   array['Besiktningsprotokoll per lägenhet','Tillvalsredovisning','Energiverifiering','Bruksinstruktioner'], 'Entreprenör',                            '2028-06-01', 31),
    (v_project_id, 'D032', 'Möblerat hotell',                   'Hotellinredning Hus A komplett',                                                  v_p6, v_a_id,     'ej-paborjad',  'Rapport',   array['Rumsinredning 200 rum','Lobbymöblering','Konferensutrustning','Restauranginredning'], 'Inredningskonsult',                            '2028-09-01', 32),
    (v_project_id, 'D033', 'Driftsprotokoll',                   'Driftsättning och injustering alla installationer',                               v_p6, v_vvs_id,   'ej-paborjad',  'Rapport',   array['Injusteringsprotokoll ventilation','Injusteringsprotokoll värme','Elbesiktning','Hissprovning'], 'Installationsentreprenör',                   '2028-10-01', 33),
    (v_project_id, 'D034', 'Slutbesiktningsprotokoll',          'Slutbesiktning alla byggnader',                                                   v_p6, v_pl_id,    'ej-paborjad',  'PDF',       array['Besiktningsprotokoll per hus','Anmärkningslista','Åtgärdsplan','Godkännande'], 'Besiktningsman',                                       '2028-11-01', 34),
    (v_project_id, 'D035', 'Relationshandlingar',               'As-built dokumentation hela projektet',                                           v_p6, v_pl_id,    'ej-paborjad',  'DWG/PDF',   array['Relationsritningar A/K/VVS/El','Materialredovisning','Garantidokumentation','CE-märkning'], 'Samtliga konsulter',                       '2028-11-01', 35),
    (v_project_id, 'D036', 'Överlämningsprotokoll',             'Formell överlämning till Part Group och hyresgäster',                             v_p7, v_pl_id,    'ej-paborjad',  'PDF',       array['Överlämningsprotokoll per hus','Nyckellista','Säkerhetssystem','Driftinstruktioner'], 'Kent Karlsson',                                   '2029-01-15', 36),
    (v_project_id, 'D037', 'Drift- & underhållsinstruktioner',  'DU-instruktioner för alla installationer',                                        v_p7, v_vvs_id,   'ej-paborjad',  'PDF',       array['DU-instruktion VVS','DU-instruktion El','DU-instruktion hissar','Serviceintervaller'], 'Samtliga konsulter',                            '2029-02-01', 37),
    (v_project_id, 'D038', 'Garantibesiktningsprotokoll',       'Garantibesiktning efter 2 år',                                                    v_p7, v_pl_id,    'ej-paborjad',  'PDF',       array['2-årsbesiktning','Anmärkningslista','Åtgärdsverifiering','Slutgodkännande'], 'Besiktningsman',                                          '2029-06-01', 38),
    (v_project_id, 'D039', 'Erfarenhetsrapport',                'Sammanställning av erfarenheter och lessons learned',                             v_p7, v_pl_id,    'ej-paborjad',  'PDF',       array['Tidplan vs utfall','Budget vs utfall','Kvalitetssammanställning','Förbättringsförslag'], 'Kent Karlsson',                                     '2029-06-01', 39)
  on conflict (project_id, code) do nothing;

  raise notice 'Seeded PARTALEN: 7 discipliner, 8 faser, 39 leverabler';
end $$;
