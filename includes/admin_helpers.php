<?php
function h($v): string
{
    return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
}

function adminFlash(string $type, string $message): void
{
    $_SESSION['flash'] = [$type, $message];
}

function adminTakeFlash(): ?array
{
    $f = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $f;
}

function adminRedirect(string $path): void
{
    header('Location: ' . BASE_URL . $path);
    exit;
}

// A table header that toggles sort direction and keeps the current filters.
function adminSortLink(string $col, string $label, string $sort, string $dir, array $params): string
{
    $next = ($sort === $col && $dir === 'asc') ? 'desc' : 'asc';
    $qs = http_build_query(array_merge($params, ['sort' => $col, 'dir' => $next]));
    $arrow = $sort === $col ? ($dir === 'asc' ? ' ▲' : ' ▼') : '';
    return '<a href="?' . h($qs) . '">' . h($label) . $arrow . '</a>';
}