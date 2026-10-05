<?php
// Beitrittsformular: prüft die Eingaben und sendet sie per E-Mail an die Gemeinschaft.
// Antwortet mit JSON, wenn das Formular per JavaScript gesendet wurde, sonst mit einer HTML-Seite.
declare(strict_types=1);

const EMPFAENGER = 'willkommen@energie-ooe.at';
const ABSENDER = 'willkommen@energie-ooe.at';

date_default_timezone_set('Europe/Vienna');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: ./#anmelden', true, 303);
    exit;
}

function feld(string $name, int $max = 200): string
{
    $wert = $_POST[$name] ?? '';
    if (!is_string($wert)) {
        return '';
    }
    // Steuerzeichen und Zeilenumbrüche entfernen (schützt auch die Mail-Header)
    $wert = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $wert) ?? '';
    return mb_substr(trim($wert), 0, $max);
}

// Zählpunkt und IBAN: ohne Leerzeichen und Punkte, in Großbuchstaben
function kennung(string $name): string
{
    return strtoupper(preg_replace('/[\s.]+/', '', feld($name, 60)) ?? '');
}

function ibanGueltig(string $iban): bool
{
    if (!preg_match('/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/', $iban)) {
        return false;
    }
    $rest = 0;
    foreach (str_split(substr($iban, 4) . substr($iban, 0, 4)) as $zeichen) {
        $zahl = ctype_digit($zeichen) ? $zeichen : (string) (ord($zeichen) - 55);
        foreach (str_split($zahl) as $ziffer) {
            $rest = ($rest * 10 + (int) $ziffer) % 97;
        }
    }
    return $rest === 1;
}

function antworten(bool $ok, array $fehler = [], int $status = 200): void
{
    if (strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'errors' => $fehler], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($ok) {
        header('Location: danke.html', true, 303);
        exit;
    }
    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    $punkte = '';
    foreach ($fehler as $meldung) {
        $punkte .= '<li>' . htmlspecialchars($meldung, ENT_QUOTES, 'UTF-8') . '</li>';
    }
    echo '<!DOCTYPE html><html lang="de-AT"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="robots" content="noindex">'
        . '<title>Anmeldung nicht gesendet – AR Bürgerenergiegemeinschaft Wels</title>'
        . '<link rel="stylesheet" href="assets/css/style.css"></head><body>'
        . '<main class="wrap legal"><h1>Anmeldung nicht gesendet</h1>'
        . '<p>Bitte korrigiere folgende Angaben:</p><ul>' . $punkte . '</ul>'
        . '<p>Mit der Zurück-Taste deines Browsers kommst du zum Formular, deine Eingaben bleiben erhalten.</p>'
        . '</main></body></html>';
    exit;
}

// Spamschutz: Das versteckte Feld füllen nur Bots aus. Sie bekommen eine Erfolgsmeldung, aber es wird nichts gesendet.
if (feld('rueckruf_fax') !== '') {
    antworten(true);
}

$teilnahme = feld('teilnahme', 20);
$bezug = $teilnahme === 'bezug' || $teilnahme === 'beides';
$einspeisung = $teilnahme === 'einspeisung' || $teilnahme === 'beides';

$vorname = feld('vorname', 80);
$nachname = feld('nachname', 80);
$strasse = feld('strasse', 120);
$plz = feld('plz', 5);
$ort = feld('ort', 80);
$telefon = feld('telefon', 30);
$email = feld('email', 120);
$netzbetreiber = feld('netzbetreiber', 80);
$zpBezug = kennung('zp_bezug');
$verbrauch = feld('verbrauch', 10);
$zpEinspeisung = kennung('zp_einspeisung');
$kwp = feld('kwp', 8);
$kontoinhaber = feld('kontoinhaber', 120);
$iban = kennung('iban');

$fehler = [];
if (!$bezug && !$einspeisung) {
    $fehler[] = 'Bitte wähle, ob du Strom beziehen, einspeisen oder beides willst.';
}
if ($vorname === '' || $nachname === '') {
    $fehler[] = 'Bitte gib deinen Vor- und Nachnamen an.';
}
if ($strasse === '' || $ort === '' || !preg_match('/^\d{4,5}$/', $plz)) {
    $fehler[] = 'Bitte gib deine vollständige Adresse mit Postleitzahl an.';
}
if (!preg_match('/^[0-9 +()\/-]{6,30}$/', $telefon)) {
    $fehler[] = 'Bitte gib eine gültige Telefonnummer an.';
}
if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $fehler[] = 'Bitte gib eine gültige E-Mail-Adresse an.';
}
if ($netzbetreiber === '') {
    $fehler[] = 'Bitte gib deinen Netzbetreiber an.';
}
if ($bezug && !preg_match('/^AT[0-9A-Z]{31}$/', $zpBezug)) {
    $fehler[] = 'Die Zählpunktnummer für den Bezug beginnt mit AT und hat 33 Zeichen.';
}
if ($bezug && $verbrauch !== '' && !preg_match('/^\d{1,7}$/', $verbrauch)) {
    $fehler[] = 'Bitte gib den Jahresverbrauch als ganze Zahl in kWh an.';
}
if ($einspeisung && !preg_match('/^AT[0-9A-Z]{31}$/', $zpEinspeisung)) {
    $fehler[] = 'Die Zählpunktnummer für die Einspeisung beginnt mit AT und hat 33 Zeichen.';
}
if ($einspeisung && !preg_match('/^\d{1,4}([.,]\d{1,2})?$/', $kwp)) {
    $fehler[] = 'Bitte gib die Leistung deiner PV-Anlage in kWp an.';
}
if ($kontoinhaber === '') {
    $fehler[] = 'Bitte gib den Kontoinhaber an.';
}
if (!ibanGueltig($iban)) {
    $fehler[] = 'Bitte prüfe die IBAN – sie ist nicht gültig.';
}
if (feld('sepa', 1) !== '1') {
    $fehler[] = 'Bitte erteile das SEPA-Lastschriftmandat.';
}
if (feld('zustimmung', 1) !== '1') {
    $fehler[] = 'Bitte akzeptiere die AGB und bestätige die Datenschutzerklärung.';
}
if ($fehler) {
    antworten(false, $fehler, 422);
}

$arten = ['bezug' => 'Strom beziehen', 'einspeisung' => 'Strom einspeisen', 'beides' => 'Strom beziehen und einspeisen'];
$zeilen = [
    'Neue Anmeldung über www.energie-ooe.at',
    'Eingegangen am ' . date('d.m.Y') . ' um ' . date('H:i') . ' Uhr',
    '',
    'Teilnahme: ' . $arten[$teilnahme],
    '',
    'PERSÖNLICHE DATEN',
    'Name: ' . $vorname . ' ' . $nachname,
    'Adresse: ' . $strasse . ', ' . $plz . ' ' . $ort,
    'Telefon: ' . $telefon,
    'E-Mail: ' . $email,
    '',
    'STROMANSCHLUSS',
    'Netzbetreiber: ' . $netzbetreiber,
];
if ($bezug) {
    $zeilen[] = 'Zählpunkt Bezug: ' . $zpBezug;
    $zeilen[] = 'Jahresverbrauch: ' . ($verbrauch !== '' ? $verbrauch . ' kWh' : 'keine Angabe');
}
if ($einspeisung) {
    $zeilen[] = 'Zählpunkt Einspeisung: ' . $zpEinspeisung;
    $zeilen[] = 'Leistung PV-Anlage: ' . str_replace('.', ',', $kwp) . ' kWp';
}
array_push(
    $zeilen,
    '',
    'BANKVERBINDUNG',
    'Kontoinhaber: ' . $kontoinhaber,
    'IBAN: ' . trim(chunk_split($iban, 4, ' ')),
    '',
    'ZUSTIMMUNGEN',
    'SEPA-Lastschriftmandat erteilt: ja',
    'AGB akzeptiert, Datenschutzerklärung gelesen: ja'
);

$betreff = '=?UTF-8?B?' . base64_encode('Neue Anmeldung: ' . $vorname . ' ' . $nachname) . '?=';
$kopf = implode("\r\n", [
    'From: Website energie-ooe.at <' . ABSENDER . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
]);

if (!mail(EMPFAENGER, $betreff, implode("\r\n", $zeilen), $kopf, '-f' . ABSENDER)) {
    antworten(false, ['Beim Senden ist ein Fehler aufgetreten. Bitte versuche es später noch einmal oder schreib uns an info@energie-ooe.at.'], 500);
}

antworten(true);
