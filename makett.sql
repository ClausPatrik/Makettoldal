-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Gép: 127.0.0.1:3307
-- Létrehozás ideje: 2025. Nov 26. 08:43
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
-- Tábla szerkezet ehhez a táblához `felhasznalo`
--

CREATE TABLE `felhasznalo` (
  `id` int(11) NOT NULL,
  `felhasznalo_nev` varchar(100) NOT NULL,
  `email` varchar(150) NOT NULL,
  `jelszo_hash` varchar(255) NOT NULL,
  `szerepkor_id` int(11) NOT NULL,
  `profil_kep_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

--
-- A tábla adatainak kiíratása `felhasznalo`
--

INSERT INTO `felhasznalo` (`id`, `felhasznalo_nev`, `email`, `jelszo_hash`, `szerepkor_id`, `profil_kep_url`) VALUES
(1, 'Admin', 'admin@pelda.hu', '$2a$10$2OnElbg0l8LSxiJI/RfhUeabEFSjEyIVWH1qLGF/.V0EEi6PARGwu', 2, NULL),
(2, 'Demó felhasználó', 'demo@pelda.hu', '$2a$10$n7fWUKsCtFng1h7dwJTRg.l4d3B1ql1F/sF4F.xvkPBJvuMAIS9N6', 1, NULL),
(3, 'Bence', 'bence@pelda.hu', 'hash3', 1, NULL),
(4, 'Lili', 'lili@pelda.hu', 'hash4', 1, NULL),
(5, 'Marci', 'marci@pelda.hu', 'hash5', 1, NULL),
(6, 'Dóri', 'dori@pelda.hu', 'hash6', 1, NULL),
(7, 'Peti', 'peti@pelda.hu', 'hash7', 1, NULL);

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
(4, 'Dioráma készítés alapjai', 'Terep, víz, hó.', 'dioráma', '2025-11-26 08:40:04', 5);

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
(5, 4, 7, 'A vízhez jó a kétkomponensű gyanta.', '2025-11-26 08:40:04');

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
(3, 4, '2025-11-26 08:40:04'),
(4, 7, '2025-11-26 08:40:04'),
(5, 10, '2025-11-26 08:40:04'),
(6, 8, '2025-11-26 08:40:04'),
(7, 12, '2025-11-26 08:40:04');

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
  `kep_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_hungarian_ci;

--
-- A tábla adatainak kiíratása `makett`
--

INSERT INTO `makett` (`id`, `nev`, `gyarto`, `kategoria`, `skala`, `nehezseg`, `megjelenes_eve`, `kep_url`) VALUES
(1, 'T-34/85 szovjet közepes harckocsi', 'Zvezda', 'harckocsi', '1:35', 3, 2019, NULL),
(2, 'Bismarck csatahajó', 'Revell', 'hajó', '1:350', 4, 2015, NULL),
(3, 'Messerschmitt Bf 109', 'Airfix', 'repülő', '1:72', 2, 2020, NULL),
(4, 'Panther Ausf. G', 'Tamiya', 'harckocsi', '1:35', 4, 2017, NULL),
(5, 'Tiger I Late', 'Rye Field Model', 'harckocsi', '1:35', 5, 2021, NULL),
(6, 'USS Missouri BB-63', 'Trumpeter', 'hajó', '1:200', 5, 2018, NULL),
(7, 'F-14 Tomcat', 'Hasegawa', 'repülő', '1:48', 3, 2022, NULL),
(8, 'P-51 Mustang', 'Tamiya', 'repülő', '1:48', 2, 2019, NULL),
(9, 'Sherman M4A3', 'Asuka', 'harckocsi', '1:35', 3, 2016, NULL),
(10, 'HMS Hood', 'Trumpeter', 'hajó', '1:350', 4, 2016, NULL),
(11, 'KV-2 nehézharckocsi', 'Trumpeter', 'harckocsi', '1:35', 2, 2018, NULL),
(12, 'Spitfire Mk Vb', 'Airfix', 'repülő', '1:72', 1, 2015, NULL);

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
(1, 'felhasznalo');

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
(7, 10, 7, 'Szép kidolgozás, de időigényes.', 4, '2025-11-26 08:40:04');

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
-- A tábla indexei `felhasznalo`
--
ALTER TABLE `felhasznalo`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_felhasznalo_szerepkor` (`szerepkor_id`);

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
  ADD PRIMARY KEY (`id`);

--
-- A tábla indexei `szerepkor`
--
ALTER TABLE `szerepkor`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nev` (`nev`);

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
-- AUTO_INCREMENT a táblához `felhasznalo`
--
ALTER TABLE `felhasznalo`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT a táblához `forum_tema`
--
ALTER TABLE `forum_tema`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT a táblához `forum_uzenet`
--
ALTER TABLE `forum_uzenet`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT a táblához `makett`
--
ALTER TABLE `makett`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT a táblához `szerepkor`
--
ALTER TABLE `szerepkor`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT a táblához `velemeny`
--
ALTER TABLE `velemeny`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

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
  ADD CONSTRAINT `fk_felhasznalo_szerepkor` FOREIGN KEY (`szerepkor_id`) REFERENCES `szerepkor` (`id`);

--
-- Megkötések a táblához `forum_tema`
--
ALTER TABLE `forum_tema`
  ADD CONSTRAINT `fk_forumtema_felhasznalo` FOREIGN KEY (`felhasznalo_id`) REFERENCES `felhasznalo` (`id`) ON DELETE CASCADE;

--
-- Megkötések a táblához `forum_uzenet`
--
ALTER TABLE `forum_uzenet`
  ADD CONSTRAINT `fk_forumuzenet_felhasznalo` FOREIGN KEY (`felhasznalo_id`) REFERENCES `felhasznalo` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_forumuzenet_tema` FOREIGN KEY (`tema_id`) REFERENCES `forum_tema` (`id`) ON DELETE CASCADE;

--
-- Megkötések a táblához `kedvenc`
--
ALTER TABLE `kedvenc`
  ADD CONSTRAINT `fk_kedvenc_felhasznalo` FOREIGN KEY (`felhasznalo_id`) REFERENCES `felhasznalo` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_kedvenc_makett` FOREIGN KEY (`makett_id`) REFERENCES `makett` (`id`) ON DELETE CASCADE;

--
-- Megkötések a táblához `velemeny`
--
ALTER TABLE `velemeny`
  ADD CONSTRAINT `fk_velemeny_felhasznalo` FOREIGN KEY (`felhasznalo_id`) REFERENCES `felhasznalo` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_velemeny_makett` FOREIGN KEY (`makett_id`) REFERENCES `makett` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
