-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Gép: 127.0.0.1:3307
-- Létrehozás ideje: 2026. Jan 29. 12:16
-- Kiszolgáló verziója: 10.4.28-MariaDB
-- PHP verzió: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Adatbázis: `makett`
--

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `makett`
--

CREATE TABLE `makett` (
  `id` int(11) NOT NULL,
  `nev` varchar(200) NOT NULL,
  `gyarto` varchar(200) NOT NULL,
  `kategoria` varchar(100) NOT NULL,
  `skala` varchar(50) NOT NULL,
  `nehezseg` int(11) NOT NULL,
  `megjelenes_eve` int(11) NOT NULL,
  `kep_url` varchar(255) DEFAULT NULL,
  `allapot` enum('jovahagyva','varakozik','elutasitva') NOT NULL DEFAULT 'jovahagyva',
  `bekuldo_felhasznalo_id` int(11) DEFAULT NULL,
  `bekuldve` datetime NOT NULL DEFAULT current_timestamp(),
  `elbiralta_admin_id` int(11) DEFAULT NULL,
  `elbiralva` datetime DEFAULT NULL,
  `elutasitas_ok` varchar(255) DEFAULT NULL,
  `leiras` text DEFAULT NULL,
  `vasarlasi_link` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

--
-- A tábla adatainak kiíratása `makett`
--

INSERT INTO `makett` (`id`, `nev`, `gyarto`, `kategoria`, `skala`, `nehezseg`, `megjelenes_eve`, `kep_url`, `allapot`, `bekuldo_felhasznalo_id`, `bekuldve`, `elbiralta_admin_id`, `elbiralva`, `elutasitas_ok`, `leiras`, `vasarlasi_link`) VALUES
(1, 'T-34/85 szovjet közepes harckocsi', 'Zvezda', 'harckocsi', '1:35', 3, 2019, 'https://www.super-hobby.hu/zdjecia/0/8/3/23688_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(2, 'Bismarck csatahajó', 'Revell', 'hajó', '1:350', 4, 2015, 'https://www.super-hobby.com/zdjecia/7/4/0/40675_05040_smrpw_battleschip_bismarck.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'Bismarck a Náci Németország egyik Bismarck osztályú cstathajója volt, Bismarck karrierje viszonylag rövid csak három évvel a vizzeken, a Dán szorossi csata sorrán HMS Prince of Whales és HMS Hoodal vívta meg párbaját, a csata sorrán Bismarck és Prinze Eugen közzösen elsülyeszteték Hoodot, ami meggrongálta Prince of Walest ami kényszerült hogy visszavonuljon, két nappal késöbb a Brit aditengerészet kegyetlen vadászatba került aminek a végén Fairey Swordfish torpedó bombázok HMS Ark Royal-tól el kezdték támadni és kettő cirkáló és csatahajó is csatlakozott a Bismarck támadásába aminek a végén a Bismarck legénysége a saját hajójukat elsülyeszteték, Bismarck 4 két ágyús toronyal amik 15 hüvelykes ágyúkal lett ellátva és számos kisseb fegyverzetel. Bismarck 241.6 méter hosszún és 36 méter széles volt.', NULL),
(3, 'Messerschmitt Bf 109', 'Airfix', 'repülő', '1:72', 2, 2020, 'https://www.super-hobby.com/zdjecia/7/6/1/59640_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(4, 'Panther Ausf. G', 'Tamiya', 'harckocsi', '1:35', 4, 2017, 'https://www.super-hobby.com/zdjecia/1/7/2/6896_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(5, 'Tiger I Late', 'Rye Field Model', 'harckocsi', '1:35', 5, 2021, 'https://www.super-hobby.com/zdjecia/4/8/8/51450_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(6, 'USS Missouri BB-63', 'Trumpeter', 'hajó', '1:200', 5, 2018, 'https://www.super-hobby.com/zdjecia/4/0/9/200_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(7, 'F-14 Tomcat', 'Hasegawa', 'repülő', '1:48', 3, 2022, 'https://www.super-hobby.com/zdjecia/0/4/9/1721_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(8, 'P-51 Mustang', 'Tamiya', 'repülő', '1:48', 2, 2019, 'https://www.super-hobby.com/zdjecia/5/4/5/115_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(9, 'Sherman M4A3', 'Asuka', 'harckocsi', '1:35', 3, 2016, 'https://www.super-hobby.com/zdjecia/9/5/9/30943_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(10, 'HMS Hood', 'Trumpeter', 'hajó', '1:350', 4, 2016, 'https://www.super-hobby.com/zdjecia/5/3/7/1166_00.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(11, 'KV-2 nehézharckocsi', 'Trumpeter', 'harckocsi', '1:35', 2, 2018, 'https://www.super-hobby.com/zdjecia/3/4/2/367_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(12, 'Spitfire Mk Vb', 'Airfix', 'repülő', '1:72', 1, 2015, 'https://www.super-hobby.com/zdjecia/9/6/9/3093_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(13, 'Gundam Aerial HG', 'Bandai', 'mecha', '1:144', 1, 2022, 'https://www.super-hobby.com/zdjecia/3/0/2/51774_rd.png', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'Aerial egy Gundam a The Witch From Mercury Anime-ből Suletta Mercury Gundamjeként és családtagjaként. Aerial a Vanadis cég Lfrith nevű gundam-jéből lett kifejlesztve Merkuron a Vanadis akcidens után amibe Ericht Samaya(Suletta belőle lett klónozva) elméje/élete lett bele rakva, a sorozat allat Aerial párbajokon vett részt, név szerint Guel és Shaddiq ellen, az uttobin annyira megsérülve hogy újra kellet épitenni. Aerial 18 méter magas és 43.9 metrikus tonna sulyú.', NULL),
(14, 'Gundam Aerial Rebuild HG', 'Bandai', 'mecha', '1:144', 1, 2023, 'https://www.super-hobby.com/zdjecia/4/4/5/60142_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'Aerial rebuild a The Witch From Mercury anime-ből van, főleg Suletta gundamjeként mielött egy párbajban Guel megszerezet amit Miorine, Suletta társa, manipulált Guel előnyére amit késöbb Suletta vissza akart lopni és akor Ericht elmegyarázta hogy Suletta valójában egy klón. Aerial rebuild 18.2 méter magas és 53.2 metrikus tonna sulyú.', NULL),
(15, 'Gundam 00 Seven Sword/G HG', 'Bandai', 'mecha', '1:144', 1, 2010, 'https://www.super-hobby.com/zdjecia/2/3/8/32064_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(16, 'Gundam 00 Seven Sword/G MG', 'Bandai', 'mecha', '1:100', 2, 2011, 'https://www.super-hobby.com/zdjecia/7/2/6/31999_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(17, 'Gundam Virtue', 'Bandai', 'mecha', '1:144', 1, 2007, 'https://www.super-hobby.com/zdjecia/0/4/9/36187_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(18, 'MBF-02 Strike Rouge EG', 'Bandai', 'mecha', '1:144', 1, 2025, 'https://www.super-hobby.com/zdjecia/4/2/8/69955_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(19, 'Gundam Dynames HG', 'Bandai', 'mecha', '1:144', 1, 2007, 'https://www.super-hobby.com/zdjecia/3/0/3/34024_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(20, 'Lightning Buster Gundam HG', 'Bandai', 'mecha', '1:144', 1, 2024, 'https://www.super-hobby.com/zdjecia/8/4/3/69534_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(21, 'HMS Prince of Wales', 'Tamiya', 'hajó', '1:350', 3, 1986, 'https://www.super-hobby.com/zdjecia/5/5/9/213_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'Prince of Wales a King George V osztályba tartozó csatahajó volt amit a Londoni haditengerészeti szerződés alatt, és ennek köszönhetően, limitált volt, ágyúi három toronyba voltak elosztva, egy két ágyus és kettő négy ágyus, amik 14 hüvelykes ágyukkal lettek ellátva mert a szerződés erre limitálta mindenkit. Princ of Wales a Dán szorosi csatában részt vett és legénysége megfigyelte HMS Hood elsülyedését, 1941 December 10-én elsülyesztette kisérőjével együtt HMS Repulse-al 85 Mitsubishi G3M és G4M bombázoknak köszönhetően Kuantan közelében. Prince of Wales 227.1 méter hosszú és 31.4 méter széles volt.', NULL),
(22, 'HMS Dreadnought 1907', 'Trumpeter', 'hajó', '1:350', 3, 2012, 'https://www.super-hobby.com/zdjecia/5/6/4/2676_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'HMS Dreadnought Britannia korszak alkotó csatahjója volt, szimpla létezése minden korabeli csatahajót semlegesített, így azon hajók Dreadnought előttieknek lettek nevezve, Dreadnought elhozta az egységes pánclzatot, sok fő torony elvét, ami a világ haditengerészeti nézetét megváltoztatta a csatahajókon, az 5 két ágyús tornyok 12 hüvelykes ágyukal let ellátva, illetve egységes másodlagos fegyverzet, és gőz turbinákal ellátva elsőként meghajtásaként, Dreadnought nem vett részt a Skagerrakki(vagy Jutlandi) csatában mert éppen átalakításon volt, egyetlen fontos akcíója a Német U-29 tengelatjáró elűjesztése volt bele ütközéssel, 1919-ben tartalékba rakták mielött 1921 Május 9-én bontásra el nem adták. Dreadnought 160.6 méter hosszú és 25 méter széles volt.', NULL),
(23, 'HMS Dreadnought 1918', 'Trumpeter', 'hajó', '1:350', 3, 2014, 'https://www.super-hobby.com/zdjecia/0/0/1/7067_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'HMS Dreadnought Britannia korszak alkotó csatahjója volt, szimpla létezése minden korabeli csatahajót semlegesített, így azon hajók Dreadnought előttieknek lettek nevezve, Dreadnought elhozta az egységes pánclzatot, sok fő torony elvét, ami a világ haditengerészeti nézetét megváltoztatta a csatahajókon, az 5 két ágyús tornyok 12 hüvelykes ágyukal let ellátva, illetve egységes másodlagos fegyverzet, és gőz turbinákal ellátva elsőként meghajtásaként, Dreadnought nem vett részt a Skagerrakki(vagy Jutlandi) csatában mert éppen átalakításon volt, egyetlen fontos akcíója a Német U-29 tengelatjáró elűjesztése volt bele ütközéssel, 1919-ben tartalékba rakták mielött 1921 Május 9-én bontásra el nem adták. Dreadnought 160.6 méter hosszú és 25 méter széles volt.', NULL),
(24, 'HMS Abercrombie', 'Trumpeter', 'hajó', '1:350', 5, 2015, 'https://www.super-hobby.com/zdjecia/5/6/1/7496_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(25, 'HMS Agincourt', 'FlyHawk', 'hajó', '1:700', 5, 2019, 'https://www.super-hobby.com/zdjecia/2/7/8/53016_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'Agincourt az életét egy Brazíl csatahajóként kezdte Rio De Janeiro néven a  Dél Amerikai Dreadnought csatahajó verseny idején Britanniából rendelve, amikor a Brazilok gumi gazdasága összeeset a szintetikus guminak köszönhetőe, és a Dél Amerikai nemzetek kibélükésével, Rio De Janeiro el lett adva az Oszmán Birodalomnak akik átnevezték I Oszmán Szultánra, az első világháború kirobanásával Britannia nem akart egy potenciális elenségnek adni egy csatahajót így I Oszmán Szultán lefoglalták 1914 Augusztusában és atnevezték HMS Agincourtra, az Agincourti csatáról amit főleg árjörözéseket és edzéseken vett részt, megjárta a Skagerraki(vagy Jutlandi) csatát 1916-ban, a háború után 1919-ben tartalékba lett rakva mielött bontásra eladták 1922 December 19-én a Washingtoni tengerészeti szerződés miatt hogy Britannia megfeleljen a feltételeknek. A hajó legénysége 1268 személyt kivánt a hatalmas mennyiségű fegyvernek köszönhetően, a 7 kétágyus fő tornyok, amik 12 hüvelykes ágyukal lett ellátva, volt a fő atrakcíója mert ez az egyetlen csatahajó aminek 7 tornya volt és meg lett építve, emellet számos kisebb másodlagos fegyverekkel lett ellátva. A hajó hossza 204.7 méter volt 27.1 méter szélességel.', NULL),
(26, 'E-75 Standardpanzer', 'Trumpeter', 'harckocsi', '1:35', 3, 2010, 'https://www.super-hobby.com/zdjecia/1/2/8/1658_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(27, 'Churchil Mk VII', 'Tamiya', 'harckocsi', '1:35', 1, 1996, 'https://www.super-hobby.com/zdjecia/9/1/6/213_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(28, 'Tiger I early', 'Tamiya', 'harckocsi', '1:35', 2, 1997, 'https://www.super-hobby.com/zdjecia/0/4/6/213_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(29, 'SU-152', 'Trumpeter', 'harckocsi', '1:35', 1, 2012, 'https://www.mojehobby.pl/zdjecia/2/9/7/2552_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(30, 'E-100 nehézharckocsi Krupp toronyal', 'Trumpeter', 'harckocsi', '1:35', 2, 2018, 'https://www.super-hobby.com/zdjecia/8/6/5/24925_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(31, 'SMS Szent István', 'Trumpeter', 'hajó', '1:350', 4, 2019, 'https://www.super-hobby.com/zdjecia/3/6/0/42825_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'Az SMS Szent István az Osztrák Magyar Monarchia Tegetthoff osztály egyik csatahajója, Szent Istvánnaak vólt néhány megkülönbeztető részlete, mint például kettő hajócsavar a négy helyet vagy a kémények körüli platform amire megfigyelő lámpákat raktak, SMS Szent István egy Olasz torpedó hajó sülyesztette el, sülyedéséről még felvétel is van. A Tegetthoff osztály 4 három ágyus fő toronyal melyek 12 hüvelykes agyukkal lettek ellátva. Szent István hossza 152.18 méter, széllesége 28 méter volt.', NULL),
(32, 'HMS Rodney', 'Trumpeter', 'hajó', '1:200', 4, 2015, 'https://www.super-hobby.com/zdjecia/7/1/5/11791_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'HMS Rodney a Nelson osztály egyik cstathajója volt, az osztáyl a Washingtoni haditengerészeti szerződés alatt lett meg tervezve és építve, ezzel a hajó nagy limitációk alá került mint suly mint fegyver ügyileg, a II világháború alatt Rodney nagy segítségre volt a Szövetségesek oldalán, 1941-ben a Bismarck után való vadászat során Rodney Bismarckot folyamat lötte és még torpedót is lőtt rá, bár még nem lett ez az akció hitelesítve hogy talált a torpedó, a háború után tartalékba rakták majd 1948 Március 26-án bontásra lett eladva. A Nelson osztálynak a salyátos terve és konstrukcíója volt a 3 három ágyús torony ami mind előre nézve a híd elött. Rodney hossza 216.5 méter és 32.3 méter széles volt.', NULL),
(33, 'Tiger I early motorizált', 'Tamiya', 'harckocsi', '1:16', 10, 2000, 'https://www.super-hobby.com/zdjecia/5/6/7/213_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(34, 'M551 Sheridan', 'Tamiya', 'harckocsi', '1:16', 8, 2019, 'https://www.super-hobby.com/zdjecia/2/9/2/30517_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(35, 'IJN Musashi', 'Tamiya', 'hajó', '1:350', 4, 2013, 'https://www.super-hobby.com/zdjecia/6/7/6/3414_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(36, 'M51', 'Takom', 'harckocsi', '1:35', 4, 2025, 'https://www.super-hobby.com/zdjecia/2/2/4/70366_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(37, 'M4A1 76(W) VVSS', 'Takom', 'harckocsi', '1:35', 3, 2025, 'https://www.super-hobby.com/zdjecia/0/2/4/70366_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(38, 'M103A2', 'Takom', 'harckocsi', '1:35', 5, 2023, 'https://www.super-hobby.com/zdjecia/1/8/9/52545_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(39, 'Merkava MK1', 'Takom', 'harckocsi', '1:35', 6, 2017, 'https://www.super-hobby.com/zdjecia/1/5/5/21269_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(40, 'Panther AusfG', 'Das Werk', 'harckocsi', '1:35', 4, 2024, 'https://www.super-hobby.com/zdjecia/5/1/4/67250_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(41, 'IJN Yamato', 'Tamiya', 'hajó', '1:350', 5, 2011, 'https://www.super-hobby.com/zdjecia/1/7/6/3414_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'Yamato a Yamato osztály egyik csatahajója volt amit a Japán birodalom rendelt meg a Londoni haditengerészeti szerződés alatt amit figyelmen kivűl hayott minden szinten, fegyverzet és súlya meghaladta a szerződés limitacióit, emelett teljes titokban készült hogy konkrét információk csak is a háború végére kerültek elő, Yamato a háború során alig volt bevetve, és amikor a fő fegyverzetét felszíni célpontoknak a lövésére használta az a Leyte-öböli csatánban volt, 1945-ben Yamatot elküldték Okinawára hogy parta sodorlya magát ezzel megvédve a szigetet, de a müvelet nem sikerült mert Kyushu szigettől délre észre vették a hadihalyókat és 1945 Április 7-én el lett sülyesztve Amerikiai Anyahajókról küldöt bombázokkal és trpedó bombázokkal. Yamato 3 három ágyús toronyal rendelkezett melyek 46 centiméteres ágyukkal lettek ellátva, 1944-ben légvédelmi további légvédelmi fegyverekkel lett ellátva. Yamato 263 méter hosszú és 38.9 méter széles volt.', NULL),
(42, 'Jagdpanzer E-100', 'Trumpeter', 'harckocsi', '1:35', 3, 2011, 'https://www.super-hobby.com/zdjecia/5/6/3/2048_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(43, 'IS-3M', 'Trumpeter', 'harckocsi', '1:35', 5, 2002, 'https://www.super-hobby.com/zdjecia/0/0/3/187_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(44, 'IS-7', 'Trumpeter', 'harckocsi', '1:35', 4, 2014, 'https://www.super-hobby.com/zdjecia/2/0/5/5796_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'A IS-7 egy Szovjet nehéz harckocsi prototípus volt, a fejlesztését lezárták miután a Szovjet hadsereg doktrinája megváltozott és közepes harckocsikatt kezdtek el használni inkább mint nehéz harckovócsikat. Tank hossza agyúval:11.17 méter, szélesség:3.44 méter és magasság:2.6 méter.', NULL),
(45, 'Bismarck', 'Trumpeter', 'hajó', '1:350', 7, 2020, 'https://www.super-hobby.com/zdjecia/8/3/4/33062_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'Bismarck a Náci Németország egyik Bismarck osztályú cstathajója volt, Bismarck karrierje viszonylag rövid csak három évvel a vizzeken, a Dán szorossi csata sorrán HMS Prince of Whales és HMS Hoodal vívta meg párbaját, a csata sorrán Bismarck és Prinze Eugen közzösen elsülyeszteték Hoodot, ami meggrongálta Prince of Walest ami kényszerült hogy visszavonuljon, két nappal késöbb a Brit aditengerészet kegyetlen vadászatba került aminek a végén Fairey Swordfish torpedó bombázok HMS Ark Royal-tól el kezdték támadni és kettő cirkáló és csatahajó is csatlakozott a Bismarck támadásába aminek a végén a Bismarck legénysége a saját hajójukat elsülyeszteték, Bismarck 4 két ágyús toronyal amik 15 hüvelykes ágyúkal lett ellátva és számos kisseb fegyverzetel. Bismarck 241.6 méter hosszún és 36 méter széles volt.', NULL),
(46, 'HMS Ark Royal', 'Airfix', 'hajó', '1:600', 4, 2018, 'https://www.super-hobby.com/zdjecia/9/7/6/28190_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(47, 'Sherman Firefly', 'Airfix', 'harckocsi', '1:35', 1, 2024, 'https://tse2.mm.bing.net/th/id/OIP.o435BzUAAAd2-XbJ7FS0awHaDf?rs=1&pid=ImgDetMain&o=7&rm=3', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(48, 'Aichi B7A1/B7A2 Ryusei', 'Fujimi', 'repülő', '1:72', 5, 2019, 'https://www.super-hobby.com/zdjecia/6/0/5/33820_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'Proba', 'https://www.msn.com/hu-hu/hirek/other/v%C3%A9ge-a-v%C3%A1rakoz%C3%A1soknak-megjelent-az-%C3%BAj-kresz/ar-AA1UyTvO?ocid=entnewsntp&pc=U531&cvid=696f48e2214c44699419ef7a04e11a9d&ei=4'),
(49, 'T-34/85 Zavod 112 - 1944', 'Italeri', 'harckocsi', '1:35', 4, 2025, 'https://www.super-hobby.com/zdjecia/4/1/8/72483_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(50, 'Crusader III AA Mk.I', 'Italeri', 'harckocsi', '1:35', 3, 2008, 'https://www.super-hobby.com/zdjecia/0/1/0/1430_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(51, 'AMS-119 Geara Doga HG', 'Bandai', 'mecha', '1:144', 2, 2008, 'https://www.super-hobby.com/zdjecia/9/4/6/63300_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(52, 'Mobile Suit F71', 'Bandai', 'mecha', '1:144', 5, 1990, 'https://tse2.mm.bing.net/th/id/OIP.Y2rDqx9ehMQS9FN1icDG6AHaHa?rs=1&pid=ImgDetMain&o=7&rm=3', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(53, 'AMX-107 Bawoo HG', 'Bandai', 'mecha', '1:144', 2, 2002, 'https://www.super-hobby.com/zdjecia/8/4/0/32732_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(54, 'M4A3 75(W) ETO', 'Dragon', 'harckocsi', '1:35', 4, 2024, 'https://www.super-hobby.com/zdjecia/5/3/2/2154_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(55, 'Churchill Mk.III', 'Italeri', 'harckocsi', '1:72', 5, 2021, 'https://www.super-hobby.com/zdjecia/6/5/5/39702_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL);

--
-- Indexek a kiírt táblákhoz
--

--
-- A tábla indexei `makett`
--
ALTER TABLE `makett`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_makett_bekuldo` (`bekuldo_felhasznalo_id`),
  ADD KEY `fk_makett_elbiralo` (`elbiralta_admin_id`),
  ADD KEY `idx_makett_allapot` (`allapot`),
  ADD KEY `idx_makett_bekuldve` (`bekuldve`);

--
-- A kiírt táblák AUTO_INCREMENT értéke
--

--
-- AUTO_INCREMENT a táblához `makett`
--
ALTER TABLE `makett`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- Megkötések a kiírt táblákhoz
--

--
-- Megkötések a táblához `makett`
--
ALTER TABLE `makett`
  ADD CONSTRAINT `fk_makett_bekuldo` FOREIGN KEY (`bekuldo_felhasznalo_id`) REFERENCES `felhasznalo` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_makett_elbiralo` FOREIGN KEY (`elbiralta_admin_id`) REFERENCES `felhasznalo` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
