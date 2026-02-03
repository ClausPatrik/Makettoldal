-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Gép: 127.0.0.1
-- Létrehozás ideje: 2026. Jan 29. 20:34
-- Kiszolgáló verziója: 10.4.32-MariaDB
-- PHP verzió: 8.2.12

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
-- Tábla szerkezet ehhez a táblához `epitesi_naplo`
--

CREATE TABLE `epitesi_naplo` (
  `id` int(11) NOT NULL,
  `makett_id` int(11) NOT NULL,
  `felhasznalo_id` int(11) NOT NULL,
  `cim` varchar(200) NOT NULL,
  `leiras` text NOT NULL,
  `kep_url` varchar(255) DEFAULT NULL,
  `letrehozva` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

--
-- A tábla adatainak kiíratása `epitesi_naplo`
--

INSERT INTO `epitesi_naplo` (`id`, `makett_id`, `felhasznalo_id`, `cim`, `leiras`, `kep_url`, `letrehozva`) VALUES
(1, 4, 3, 'Panther építés 1. lépés', 'Alsótest összeépítése.', NULL, '2025-11-26 08:40:04'),
(2, 5, 4, 'Tiger I festése', 'Alapszín felhordása.', NULL, '2025-11-26 08:40:04'),
(3, 7, 5, 'F-14 kabin', 'Részletezés és matrica.', NULL, '2025-11-26 08:40:04'),
(4, 10, 6, 'HMS Hood törzs', 'Féltestek összeállítása.', NULL, '2025-11-26 08:40:04');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `epitesi_tippek_blokk`
--

CREATE TABLE `epitesi_tippek_blokk` (
  `id` int(11) NOT NULL,
  `naplo_id` int(11) NOT NULL,
  `tipus` varchar(40) NOT NULL,
  `cim` varchar(120) NOT NULL,
  `tippek` text NOT NULL,
  `sorrend` int(11) NOT NULL DEFAULT 0,
  `letrehozva` timestamp NOT NULL DEFAULT current_timestamp(),
  `frissitve` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `epitesi_tippek_blokk`
--

INSERT INTO `epitesi_tippek_blokk` (`id`, `naplo_id`, `tipus`, `cim`, `tippek`, `sorrend`, `letrehozva`, `frissitve`) VALUES
(1, 1, 'egyeb', 'fdgfd', 'hdfhdf', 1, '2026-01-20 09:22:30', '2026-01-20 09:22:30');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `epitesi_tippek_naplo`
--

CREATE TABLE `epitesi_tippek_naplo` (
  `id` int(11) NOT NULL,
  `makett_id` int(11) NOT NULL,
  `letrehozo_felhasznalo_id` int(11) NOT NULL,
  `cim` varchar(120) NOT NULL DEFAULT 'Építési tippek',
  `letrehozva` timestamp NOT NULL DEFAULT current_timestamp(),
  `frissitve` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `epitesi_tippek_naplo`
--

INSERT INTO `epitesi_tippek_naplo` (`id`, `makett_id`, `letrehozo_felhasznalo_id`, `cim`, `letrehozva`, `frissitve`) VALUES
(1, 48, 8, 'Építési napló', '2026-01-20 09:22:04', '2026-01-20 09:22:04');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `felhasznalo`
--

CREATE TABLE `felhasznalo` (
  `id` int(11) NOT NULL,
  `felhasznalo_nev` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `jelszo_hash` varchar(255) NOT NULL,
  `szerepkor_id` int(11) NOT NULL,
  `profil_kep_url` varchar(255) DEFAULT NULL,
  `csatlakozas_datum` datetime NOT NULL DEFAULT current_timestamp(),
  `tiltva` enum('nincs','ideiglenes','vegleges') NOT NULL DEFAULT 'nincs',
  `tilt_eddig` datetime DEFAULT NULL,
  `tilt_ok` varchar(255) DEFAULT NULL,
  `tiltva_ekkor` datetime DEFAULT NULL,
  `tiltva_admin_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

--
-- A tábla adatainak kiíratása `felhasznalo`
--

INSERT INTO `felhasznalo` (`id`, `felhasznalo_nev`, `email`, `jelszo_hash`, `szerepkor_id`, `profil_kep_url`, `csatlakozas_datum`, `tiltva`, `tilt_eddig`, `tilt_ok`, `tiltva_ekkor`, `tiltva_admin_id`) VALUES
(1, 'Admin', 'admin@pelda.hu', '$2a$10$2OnElbg0l8LSxiJI/RfhUeabEFSjEyIVWH1qLGF/.V0EEi6PARGwu', 2, 'http://localhost:3001/uploads/profil_1_1765825912915.jpg', '2026-01-29 16:18:23', 'nincs', NULL, NULL, NULL, NULL),
(2, 'Demó felhasználó', 'demo@pelda.hu', '$2a$10$n7fWUKsCtFng1h7dwJTRg.l4d3B1ql1F/sF4F.xvkPBJvuMAIS9N6', 1, NULL, '2026-01-29 16:18:23', 'vegleges', NULL, 'fsd', '2026-01-29 20:17:02', 1),
(3, 'Bence', 'bence@pelda.hu', 'hash3', 1, NULL, '2026-01-29 16:18:23', 'nincs', NULL, NULL, NULL, NULL),
(4, 'Lili', 'lili@pelda.hu', 'hash4', 1, NULL, '2026-01-29 16:18:23', 'nincs', NULL, NULL, NULL, NULL),
(5, 'Marci', 'marci@pelda.hu', 'hash5', 1, NULL, '2026-01-29 16:18:23', 'nincs', NULL, NULL, NULL, NULL),
(6, 'Dóri', 'dori@pelda.hu', 'hash6', 1, NULL, '2026-01-29 16:18:23', 'nincs', NULL, NULL, NULL, NULL),
(7, 'Peti', 'peti@pelda.hu', 'hash7', 1, NULL, '2026-01-29 16:18:23', 'nincs', NULL, NULL, NULL, NULL),
(8, '10', 'proba@gmail.com', '$2a$10$4XScIJlyHRIolmA4Cor3leDgiOx6Dg1qzq99QN9eGw4GBe6Yv9hNG', 1, NULL, '2026-01-29 16:18:23', 'nincs', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `felhasznalo_aktivitas`
--

CREATE TABLE `felhasznalo_aktivitas` (
  `id` int(11) NOT NULL,
  `felhasznalo_id` int(11) NOT NULL,
  `tipus` varchar(80) NOT NULL,
  `cel_tipus` varchar(80) DEFAULT NULL,
  `cel_id` int(11) DEFAULT NULL,
  `szoveg` varchar(255) DEFAULT NULL,
  `meta_json` text DEFAULT NULL,
  `ip` varchar(80) DEFAULT NULL,
  `letrehozva` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

--
-- A tábla adatainak kiíratása `felhasznalo_aktivitas`
--

INSERT INTO `felhasznalo_aktivitas` (`id`, `felhasznalo_id`, `tipus`, `cel_tipus`, `cel_id`, `szoveg`, `meta_json`, `ip`, `letrehozva`) VALUES
(1, 1, 'ADMIN_SZEREPKOR', 'felhasznalo', 2, 'szerepkor_id -> 3', NULL, '::1', '2026-01-29 20:16:50'),
(2, 1, 'ADMIN_SZEREPKOR', 'felhasznalo', 2, 'szerepkor_id -> 1', NULL, '::1', '2026-01-29 20:16:54'),
(3, 1, 'ADMIN_TILTAS', 'felhasznalo', 2, 'vegleges', '{\"tilt_ok\":\"fsd\"}', '::1', '2026-01-29 20:17:02'),
(4, 1, 'ADMIN_SZEREPKOR', 'felhasznalo', 4, 'szerepkor_id -> 1', NULL, '::1', '2026-01-29 20:33:27');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `forum_tema`
--

CREATE TABLE `forum_tema` (
  `id` int(11) NOT NULL,
  `cim` varchar(200) NOT NULL,
  `leiras` text DEFAULT NULL,
  `kategoria` varchar(100) DEFAULT NULL,
  `letrehozva` datetime NOT NULL DEFAULT current_timestamp(),
  `felhasznalo_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

--
-- A tábla adatainak kiíratása `forum_tema`
--

INSERT INTO `forum_tema` (`id`, `cim`, `leiras`, `kategoria`, `letrehozva`, `felhasznalo_id`) VALUES
(1, 'Proba', 'vahsvdvhavdvzvqawzuvdvhvPEHFVVHFVHVDHSA', 'építési napló', '2025-11-24 22:00:14', 1),
(2, 'Repülők panelozása', 'Panelek, wash technikák.', 'repülő', '2025-11-26 08:40:04', 3),
(3, 'Hajó makettek festése', 'Maszkolás, rétegek.', 'hajó', '2025-11-26 08:40:04', 4),
(4, 'Dioráma készítés alapjai', 'Terep, víz, hó.', 'dioráma', '2025-11-26 08:40:04', 5),
(5, 'fsd', 'fsd', 'általános', '2025-12-15 19:37:06', 2);

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `forum_uzenet`
--

CREATE TABLE `forum_uzenet` (
  `id` int(11) NOT NULL,
  `tema_id` int(11) NOT NULL,
  `felhasznalo_id` int(11) NOT NULL,
  `szoveg` text NOT NULL,
  `letrehozva` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

--
-- A tábla adatainak kiíratása `forum_uzenet`
--

INSERT INTO `forum_uzenet` (`id`, `tema_id`, `felhasznalo_id`, `szoveg`, `letrehozva`) VALUES
(1, 2, 3, 'Érdemes sötét wash-t használni.', '2025-11-26 08:40:04'),
(2, 2, 4, 'A panelek hangsúlyozása sokat dob a végeredményen.', '2025-11-26 08:40:04'),
(3, 3, 5, 'Hajóknál nagyon fontos a vékony réteg.', '2025-11-26 08:40:04'),
(4, 4, 6, 'A diorámához érdemes pigmenteket használni.', '2025-11-26 08:40:04'),
(5, 4, 7, 'A vízhez jó a kétkomponensű gyanta.', '2025-11-26 08:40:04'),
(6, 5, 2, 'fsd', '2025-12-15 19:37:23'),
(7, 5, 2, 'fsdfsd', '2025-12-15 19:37:43'),
(8, 2, 2, 'Jó napot', '2026-01-29 17:19:51');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `kedvenc`
--

CREATE TABLE `kedvenc` (
  `felhasznalo_id` int(11) NOT NULL,
  `makett_id` int(11) NOT NULL,
  `letrehozva` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

--
-- A tábla adatainak kiíratása `kedvenc`
--

INSERT INTO `kedvenc` (`felhasznalo_id`, `makett_id`, `letrehozva`) VALUES
(1, 48, '2025-12-15 20:14:46'),
(2, 48, '2025-12-15 19:36:23'),
(3, 4, '2025-11-26 08:40:04'),
(4, 7, '2025-11-26 08:40:04'),
(5, 10, '2025-11-26 08:40:04'),
(6, 8, '2025-11-26 08:40:04'),
(7, 12, '2025-11-26 08:40:04'),
(8, 48, '2026-01-20 10:24:01');

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
(30, 'E-100 nehézharckocsi Krupp toronyal', 'Trumpeter', 'harckocsi', '1:35', 2, 2018, 'https://www.super-hobby.com/zdjecia/8/6/5/24925_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'Az E-100 egy Náci Német nehéz tank volt ami a Königstiger néhány, de fontos, komponensét használta mint például transzmiszió és motor, hogy az árát lent tartsák és sztenderdizálják azon komponenseket, az E-100-nak a teste meg lett építve a IIvh vége elött nem úgy mint a legtöbb hasrckocsi az E széríából amit a Brittek el loptak és megtesztelték mielött el lett bontva. A tank hossza 8.73 méter, szélessége 4.48 méter és magassága 3.38 méter, súlya 140 tonna volt.', NULL),
(31, 'SMS Szent István', 'Trumpeter', 'hajó', '1:350', 4, 2019, 'https://www.super-hobby.com/zdjecia/3/6/0/42825_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'Az SMS Szent István az Osztrák Magyar Monarchia Tegetthoff osztály egyik csatahajója, Szent Istvánnaak vólt néhány megkülönbeztető részlete, mint például kettő hajócsavar a négy helyet vagy a kémények körüli platform amire megfigyelő lámpákat raktak, SMS Szent István egy Olasz torpedó hajó sülyesztette el, sülyedéséről még felvétel is van. A Tegetthoff osztály 4 három ágyus fő toronyal melyek 12 hüvelykes agyukkal lettek ellátva. Szent István hossza 152.18 méter, széllesége 28 méter volt.', NULL),
(32, 'HMS Rodney', 'Trumpeter', 'hajó', '1:200', 4, 2015, 'https://www.super-hobby.com/zdjecia/7/1/5/11791_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'HMS Rodney a Nelson osztály egyik csatahajója volt, az osztáyl a Washingtoni haditengerészeti szerződés alatt lett meg tervezve és építve, ezzel a hajó nagy limitációk alá került mint suly mint fegyver ügyileg, a II világháború alatt Rodney nagy segítségre volt a Szövetségesek oldalán, 1941-ben a Bismarck után való vadászat során Rodney Bismarckot folyamat lötte és még torpedót is lőtt rá, bár még nem lett ez az akció hitelesítve hogy talált a torpedó, a háború után tartalékba rakták majd 1948 Március 26-án bontásra lett eladva. A Nelson osztálynak a salyátos terve és konstrukcíója volt a 3 három ágyús torony ami mind előre nézve a híd elött. Rodney hossza 216.5 méter és 32.3 méter széles volt.', NULL),
(33, 'Tiger I early motorizált', 'Tamiya', 'harckocsi', '1:16', 10, 2000, 'https://www.super-hobby.com/zdjecia/5/6/7/213_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(34, 'M551 Sheridan', 'Tamiya', 'harckocsi', '1:16', 8, 2019, 'https://www.super-hobby.com/zdjecia/2/9/2/30517_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(35, 'IJN Musashi', 'Tamiya', 'hajó', '1:350', 4, 2013, 'https://www.super-hobby.com/zdjecia/6/7/6/3414_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'IJN Musahsi a Yamato osztály második csatahajója volt, mint Yamato Mushashi hasonló életet élt mint csapatszállító, a Londoni haditengerészeti szerződés alatt épülve szintén titokban mint testverhajóji, Musashi szintén túlllépte a szerződés által szeget limitácíókat mint suly vagy ágyú mérett, 1944 Október 24-én a Leyte-öböli csatában lett elsülyesztve 19 torpedó és 17 bombának köszönhetően Amerikai anyahajókról küldött repülők által, 2015-ben egy Microsoft társalapító által bérelt kutató csapat a roncsát megtalálta. Musashi Yamato 3 három ágyús toronyal rendelkezett melyek 46 centiméteres ágyukkal lettek ellátva, 1944-ben további légvédelmi fegyverekkel lett ellátva. Yamato 263 méter hosszú és 38.9 méter széles volt.', NULL),
(36, 'M51', 'Takom', 'harckocsi', '1:35', 4, 2025, 'https://www.super-hobby.com/zdjecia/2/2/4/70366_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(37, 'M4A1 76(W) VVSS', 'Takom', 'harckocsi', '1:35', 3, 2025, 'https://www.super-hobby.com/zdjecia/0/2/4/70366_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(38, 'M103A2', 'Takom', 'harckocsi', '1:35', 5, 2023, 'https://www.super-hobby.com/zdjecia/1/8/9/52545_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(39, 'Merkava MK1', 'Takom', 'harckocsi', '1:35', 6, 2017, 'https://www.super-hobby.com/zdjecia/1/5/5/21269_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(40, 'Panther AusfG', 'Das Werk', 'harckocsi', '1:35', 4, 2024, 'https://www.super-hobby.com/zdjecia/5/1/4/67250_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(41, 'IJN Yamato', 'Tamiya', 'hajó', '1:350', 5, 2011, 'https://www.super-hobby.com/zdjecia/1/7/6/3414_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'Yamato a Yamato osztály egyik csatahajója volt amit a Japán birodalom rendelt meg a Londoni haditengerészeti szerződés alatt amit figyelmen kivűl hayott minden szinten, fegyverzet és súlya meghaladta a szerződés limitacióit, emelett teljes titokban készült hogy konkrét információk csak is a háború végére kerültek elő, Yamato a háború során alig volt bevetve, és amikor a fő fegyverzetét felszíni célpontoknak a lövésére használta az a Leyte-öböli csatánban volt, 1945-ben Yamatot elküldték Okinawára hogy parta sodorlya magát ezzel megvédve a szigetet, de a müvelet nem sikerült mert Kyushu szigettől délre észre vették a hadihalyókat és 1945 Április 7-én el lett sülyesztve Amerikiai Anyahajókról küldöt bombázokkal és trpedó bombázokkal. Yamato 3 három ágyús toronyal rendelkezett melyek 46 centiméteres ágyukkal lettek ellátva, 1944-ben légvédelmi további légvédelmi fegyverekkel lett ellátva. Yamato 263 méter hosszú és 38.9 méter széles volt.', NULL),
(42, 'Jagdpanzer E-100', 'Trumpeter', 'harckocsi', '1:35', 3, 2011, 'https://www.super-hobby.com/zdjecia/5/6/3/2048_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(43, 'IS-3M', 'Trumpeter', 'harckocsi', '1:35', 5, 2002, 'https://www.super-hobby.com/zdjecia/0/0/3/187_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(44, 'IS-7', 'Trumpeter', 'harckocsi', '1:35', 4, 2014, 'https://www.super-hobby.com/zdjecia/2/0/5/5796_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'A IS-7 egy Szovjet nehéz harckocsi prototípus volt, a fejlesztését lezárták miután a Szovjet hadsereg doktrinája megváltozott és közepes harckocsikatt kezdtek el használni inkább mint nehéz harckovócsikat. Tank hossza agyúval:11.17 méter, szélesség:3.44 méter és magasság:2.6 méter.', NULL),
(45, 'Bismarck', 'Trumpeter', 'hajó', '1:350', 7, 2020, 'https://www.super-hobby.com/zdjecia/8/3/4/33062_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'Bismarck a Náci Németország egyik Bismarck osztályú csatahajója volt, Bismarck karrierje viszonylag rövid csak három évvel a vizzeken, a Dán szorossi csata sorrán HMS Prince of Whales és HMS Hoodal vívta meg párbaját, a csata sorrán Bismarck és Prinze Eugen közzösen elsülyeszteték Hoodot, ami meggrongálta Prince of Walest ami kényszerült hogy visszavonuljon, két nappal késöbb a Brit aditengerészet kegyetlen vadászatba került aminek a végén Fairey Swordfish torpedó bombázok HMS Ark Royal-tól el kezdték támadni és kettő cirkáló és csatahajó is csatlakozott a Bismarck támadásába aminek a végén a Bismarck legénysége a saját hajójukat elsülyeszteték, Bismarck 4 két ágyús toronyal amik 15 hüvelykes ágyúkal lett ellátva és számos kisseb fegyverzetel. Bismarck 241.6 méter hosszún és 36 méter széles volt.', NULL),
(46, 'HMS Ark Royal', 'Airfix', 'hajó', '1:600', 4, 2018, 'https://www.super-hobby.com/zdjecia/9/7/6/28190_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(47, 'Sherman Firefly', 'Airfix', 'harckocsi', '1:35', 1, 2024, 'https://tse2.mm.bing.net/th/id/OIP.o435BzUAAAd2-XbJ7FS0awHaDf?rs=1&pid=ImgDetMain&o=7&rm=3', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'A Sherman Firefly az Amerikai Sherman M4A4 és sima M4 Sherman-ekből lettek átalakítva, az eredeti 75 mm-es ágyut kiszedve hekyetesíteték a 17 fontos ágyúval és a rádíót a torony hátsó részére, egy páncélozot dobozba rakták mert kellet a belső hely, a tőltény méretének miatt a segéd sofört kiszedték és több töltényt raktak helyére. A tank hossza általában 5.89 méter, szélessége 2.64 méter, magassága 2.74 méter, súlya 35.3 tonna volt.', NULL),
(48, 'Aichi B7A1/B7A2 Ryusei', 'Fujimi', 'repülő', '1:72', 5, 2019, 'https://www.super-hobby.com/zdjecia/6/0/5/33820_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, 'Proba', 'https://www.msn.com/hu-hu/hirek/other/v%C3%A9ge-a-v%C3%A1rakoz%C3%A1soknak-megjelent-az-%C3%BAj-kresz/ar-AA1UyTvO?ocid=entnewsntp&pc=U531&cvid=696f48e2214c44699419ef7a04e11a9d&ei=4'),
(49, 'T-34/85 Zavod 112 - 1944', 'Italeri', 'harckocsi', '1:35', 4, 2025, 'https://www.super-hobby.com/zdjecia/4/1/8/72483_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(50, 'Crusader III AA Mk.I', 'Italeri', 'harckocsi', '1:35', 3, 2008, 'https://www.super-hobby.com/zdjecia/0/1/0/1430_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(51, 'AMS-119 Geara Doga HG', 'Bandai', 'mecha', '1:144', 2, 2008, 'https://www.super-hobby.com/zdjecia/9/4/6/63300_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(52, 'Mobile Suit F71', 'Bandai', 'mecha', '1:144', 5, 1990, 'https://tse2.mm.bing.net/th/id/OIP.Y2rDqx9ehMQS9FN1icDG6AHaHa?rs=1&pid=ImgDetMain&o=7&rm=3', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(53, 'AMX-107 Bawoo HG', 'Bandai', 'mecha', '1:144', 2, 2002, 'https://www.super-hobby.com/zdjecia/8/4/0/32732_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(54, 'M4A3 75(W) ETO', 'Dragon', 'harckocsi', '1:35', 4, 2024, 'https://www.super-hobby.com/zdjecia/5/3/2/2154_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL),
(55, 'Churchill Mk.III', 'Italeri', 'harckocsi', '1:72', 5, 2021, 'https://www.super-hobby.com/zdjecia/6/5/5/39702_rd.jpg', 'jovahagyva', NULL, '2025-12-15 19:57:10', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `szerepkor`
--

CREATE TABLE `szerepkor` (
  `id` int(11) NOT NULL,
  `nev` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

--
-- A tábla adatainak kiíratása `szerepkor`
--

INSERT INTO `szerepkor` (`id`, `nev`) VALUES
(2, 'admin'),
(1, 'felhasznalo'),
(3, 'moderator');

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `uzenetek`
--

CREATE TABLE `uzenetek` (
  `id` int(11) NOT NULL,
  `kuldo_felhasznalo_id` int(11) NOT NULL,
  `targy` varchar(120) NOT NULL,
  `uzenet` text NOT NULL,
  `letrehozva` timestamp NOT NULL DEFAULT current_timestamp(),
  `olvasva` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- A tábla adatainak kiíratása `uzenetek`
--

INSERT INTO `uzenetek` (`id`, `kuldo_felhasznalo_id`, `targy`, `uzenet`, `letrehozva`, `olvasva`) VALUES
(2, 8, 'rggftgdfdf', 'kgsmkőamksgmkmdskg', '2026-01-20 07:42:45', 0);

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `velemeny`
--

CREATE TABLE `velemeny` (
  `id` int(11) NOT NULL,
  `makett_id` int(11) NOT NULL,
  `felhasznalo_id` int(11) NOT NULL,
  `szoveg` text NOT NULL,
  `ertekeles` int(11) NOT NULL,
  `letrehozva` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

--
-- A tábla adatainak kiíratása `velemeny`
--

INSERT INTO `velemeny` (`id`, `makett_id`, `felhasznalo_id`, `szoveg`, `ertekeles`, `letrehozva`) VALUES
(3, 4, 3, 'Szuper részletek és jó illesztés.', 5, '2025-11-26 08:40:04'),
(4, 5, 4, 'Kicsit nehéz, de látványos.', 4, '2025-11-26 08:40:04'),
(5, 7, 5, 'Nagyon jó matricalap.', 5, '2025-11-26 08:40:04'),
(6, 8, 6, 'Gyorsan összerakható készlet.', 4, '2025-11-26 08:40:04'),
(7, 10, 7, 'Szép kidolgozás, de időigényes.', 4, '2025-11-26 08:40:04'),
(8, 48, 2, 'nagyon jó', 5, '2025-12-15 19:38:23');

--
-- Indexek a kiírt táblákhoz
--

--
-- A tábla indexei `epitesi_naplo`
--
ALTER TABLE `epitesi_naplo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_epitesi_makett` (`makett_id`),
  ADD KEY `fk_epitesi_felhasznalo` (`felhasznalo_id`);

--
-- A tábla indexei `epitesi_tippek_blokk`
--
ALTER TABLE `epitesi_tippek_blokk`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tippek_blokk_naplo` (`naplo_id`),
  ADD KEY `idx_tippek_blokk_sorrend` (`naplo_id`,`sorrend`);

--
-- A tábla indexei `epitesi_tippek_naplo`
--
ALTER TABLE `epitesi_tippek_naplo`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `makett_id` (`makett_id`),
  ADD KEY `letrehozo_felhasznalo_id` (`letrehozo_felhasznalo_id`);

--
-- A tábla indexei `felhasznalo`
--
ALTER TABLE `felhasznalo`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_felhasznalo_szerepkor` (`szerepkor_id`),
  ADD KEY `fk_felhasznalo_tiltva_admin` (`tiltva_admin_id`),
  ADD KEY `idx_felhasznalo_csatlakozas` (`csatlakozas_datum`);

--
-- A tábla indexei `felhasznalo_aktivitas`
--
ALTER TABLE `felhasznalo_aktivitas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_aktivitas_user` (`felhasznalo_id`),
  ADD KEY `idx_aktivitas_date` (`letrehozva`);

--
-- A tábla indexei `forum_tema`
--
ALTER TABLE `forum_tema`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_forumtema_felhasznalo` (`felhasznalo_id`);

--
-- A tábla indexei `forum_uzenet`
--
ALTER TABLE `forum_uzenet`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_forumuzenet_tema` (`tema_id`),
  ADD KEY `fk_forumuzenet_felhasznalo` (`felhasznalo_id`);

--
-- A tábla indexei `kedvenc`
--
ALTER TABLE `kedvenc`
  ADD PRIMARY KEY (`felhasznalo_id`,`makett_id`),
  ADD KEY `fk_kedvenc_makett` (`makett_id`);

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
-- A tábla indexei `szerepkor`
--
ALTER TABLE `szerepkor`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nev` (`nev`);

--
-- A tábla indexei `uzenetek`
--
ALTER TABLE `uzenetek`
  ADD PRIMARY KEY (`id`),
  ADD KEY `kuldo_felhasznalo_id` (`kuldo_felhasznalo_id`);

--
-- A tábla indexei `velemeny`
--
ALTER TABLE `velemeny`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_velemeny_makett` (`makett_id`),
  ADD KEY `fk_velemeny_felhasznalo` (`felhasznalo_id`);

--
-- A kiírt táblák AUTO_INCREMENT értéke
--

--
-- AUTO_INCREMENT a táblához `epitesi_naplo`
--
ALTER TABLE `epitesi_naplo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT a táblához `epitesi_tippek_blokk`
--
ALTER TABLE `epitesi_tippek_blokk`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT a táblához `epitesi_tippek_naplo`
--
ALTER TABLE `epitesi_tippek_naplo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT a táblához `felhasznalo`
--
ALTER TABLE `felhasznalo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT a táblához `felhasznalo_aktivitas`
--
ALTER TABLE `felhasznalo_aktivitas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT a táblához `forum_tema`
--
ALTER TABLE `forum_tema`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT a táblához `forum_uzenet`
--
ALTER TABLE `forum_uzenet`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT a táblához `makett`
--
ALTER TABLE `makett`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=57;

--
-- AUTO_INCREMENT a táblához `szerepkor`
--
ALTER TABLE `szerepkor`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT a táblához `uzenetek`
--
ALTER TABLE `uzenetek`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT a táblához `velemeny`
--
ALTER TABLE `velemeny`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Megkötések a kiírt táblákhoz
--

--
-- Megkötések a táblához `epitesi_naplo`
--
ALTER TABLE `epitesi_naplo`
  ADD CONSTRAINT `fk_epitesi_felhasznalo` FOREIGN KEY (`felhasznalo_id`) REFERENCES `felhasznalo` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_epitesi_makett` FOREIGN KEY (`makett_id`) REFERENCES `makett` (`id`) ON DELETE CASCADE;

--
-- Megkötések a táblához `felhasznalo`
--
ALTER TABLE `felhasznalo`
  ADD CONSTRAINT `fk_felhasznalo_tiltva_admin` FOREIGN KEY (`tiltva_admin_id`) REFERENCES `felhasznalo` (`id`) ON DELETE SET NULL;

--
-- Megkötések a táblához `felhasznalo_aktivitas`
--
ALTER TABLE `felhasznalo_aktivitas`
  ADD CONSTRAINT `fk_aktivitas_user` FOREIGN KEY (`felhasznalo_id`) REFERENCES `felhasznalo` (`id`) ON DELETE CASCADE;

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
