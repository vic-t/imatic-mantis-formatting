<?php

$autoload = __DIR__ . '/vendor/autoload.php';
if (is_file($autoload)) {
    require_once $autoload;
}

use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\InlinesOnly\InlinesOnlyExtension;
use League\CommonMark\MarkdownConverter;
use League\CommonMark\MarkdownConverterInterface;

class ImaticFormattingPlugin extends MantisPlugin
{
    const TOASTUI_ENABLED = 'plugin_ImaticFormatting_toastui_enabled';
    public function register(): void
    {
        $this->name = 'Imatic formatting';
        $this->description = 'Formatting';
        $this->version = '0.3.8';
        $this->requires = [
            'MantisCore' => '2.0.0',
        ];
        $this->page = 'config_page';

        $this->author = 'Imatic Software s.r.o.';
        $this->contact = 'info@imatic.cz';
        $this->url = 'https://www.imatic.cz/';
    }

    public function hooks(): array
    {
        return [
            'EVENT_DISPLAY_FORMATTED' => 'display_formatted_hook',
            'EVENT_LAYOUT_RESOURCES' => 'layout_resources_hook',
            'EVENT_LAYOUT_BODY_END' => 'layout_end_resources_hook',
            'EVENT_ACCOUNT_PREF_UPDATE_FORM' => 'account_update_form',
            'EVENT_ACCOUNT_PREF_UPDATE' => 'account_update',
        ];
    }

    public function config(): array
    {
        return [
            'include_prism' => true,
            'toastui_editor' => [
                'enabled' => true,
                'textAreas' => [
                    'description',
                    'steps_to_reproduce',
                    'additional_info',
                    'additional_information',
                    'bugnote_text'
                ],
                'options' => [
                    'initialEditType' => 'markdown', # 'markdown' or 'wysiwyg'
                    'previewStyle' => 'tab', # 'tab' or 'vertical'
                    'height' => false, // SET NUMBER or false for default height from mantisbt + BAR height
                    'useDefaultHTMLSanitizer' => true,
                    'useCommandShortcut' => true,
                    'useDefaultHTMLSanitizerOptions' => [
                        'allowAttributes' => ['class', 'style'],
                        'allowTags' => ['a', 'b', 'i', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
                    ],
                ],
            ]
        ];
    }

    private function getOneLineConverter(): MarkdownConverterInterface
    {
        static $converter = null;
        if ($converter === null) {
            $environment = new Environment([
                'html_input' => 'escape',
                'allow_unsafe_links' => false,
            ]);
            $environment->addExtension(new InlinesOnlyExtension());
            $converter = new MarkdownConverter($environment);
        }

        return $converter;
    }

    private function getMultiLineConverter(): MarkdownConverterInterface
    {
        static $converter = null;
        if ($converter === null) {
            // GitHub-flavored Markdown, but with the stock TaskList extension
            // replaced by one that renders EVERY "[ ]"/"[x]" marker as a
            // checkbox (also mid-line and several per line), not only the first
            // one in a list item.
            require_once __DIR__ . '/inc/Checkbox/CheckboxMarkdown.php';
            $converter = \ImaticFormatting\Checkbox\CheckboxMarkdown::createConverter([
                'html_input' => 'allow',
                'allow_unsafe_links' => false,
                'table' => [
                    'wrap' => [
                        'enabled' => true,
                        'attributes' => [
                            'class' => 'imatic-formatting-table',
                        ],
                    ],
                ],
            ]);
        }

        return $converter;
    }

    private function sanitizeEmailHtml(string $text): string
    {
        $text = preg_replace('/^[ \t]{4,}/m', '', $text);

        $text = preg_replace('~<meta[^>]*>~i', '', $text);                  // <meta charset=...>
        $text = preg_replace('~<title>.*?</title>~is', '', $text);          // <title></title>
        $text = preg_replace('~<style[^>]*>.*?</style>~is', '', $text);     //  <style> ...</style>
        $text = preg_replace('~<div class="preheader">.*?</div>~is', '', $text); // preheader
        $text = preg_replace('~<img[^>]*src="http[^"]*email\.azns\.microsoft\.com[^"]*"[^>]*>~i', '', $text); // tracking pixel
        $text = preg_replace('#<script[^>]*>.*?</script>#is', '', $text);      // <script> ...</script>

        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Extract only body content — prevents <html>/<head>/<body> from corrupting page layout
        if (stripos($text, '<body') !== false) {
            $dom = new DOMDocument();
            libxml_use_internal_errors(true);
            $dom->loadHTML('<?xml encoding="UTF-8">' . $text, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
            libxml_clear_errors();
            $body = $dom->getElementsByTagName('body')->item(0);
            if ($body !== null) {
                $fragment = '';
                foreach ($body->childNodes as $child) {
                    $fragment .= $dom->saveHTML($child);
                }
                $text = $fragment;
            }
        }

        return $text;
    }


    private function isHtmlEmail(string $text): bool
    {
        $decoded = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Minimal HTML structure
        if (preg_match('/<html|<body|<head/i', $decoded)) {
            return true;
        }

        // Tables typical for email layouts
        if (preg_match_all('/<table/i', $decoded) > 0) {
            return true;
        }

        // Inline style / style blocks
        if (preg_match('/<style/i', $decoded)) {
            return true;
        }

        // Mailto links (reply to)
        if (preg_match('/<a[^>]+mailto:/i', $decoded)) {
            return true;
        }

        return false;
    }


    public function convert(string $text, bool $multiline = true): string
    {
        if ($multiline && $this->isHtmlEmail($text)) {
            $html = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $html = preg_replace('#<script[^>]*>.*?</script>#is', '', $html);
            return '<iframe srcdoc="' . htmlspecialchars($html, ENT_QUOTES, 'UTF-8') . '" style="width:100%;min-height:500px;border:none;" sandbox="allow-same-origin" loading="lazy"></iframe>';
        }

        $converter = $this->getConverter($multiline);

        return string_process_bugnote_link(
            string_process_bug_link(
                mention_format_text(
                    (string)$converter->convert($text)
                )
            )
        );
    }

    public function display_formatted_hook($p_event, $p_string, $p_multiline = true)
    {
        return $this->convert($p_string, (bool)$p_multiline);
    }

    private function getConverter($p_multiline = true): MarkdownConverterInterface
    {
        return $p_multiline ? $this->getMultiLineConverter() : $this->getOneLineConverter();
    }

    private function prism_includes()
    {
        if (!plugin_config_get('include_prism', null, true)) {
            return '';
        }

        return '<link rel="stylesheet" type="text/css" href="' . plugin_file('prism.css') . '&v=' . $this->version . '" />'
            . '<script async type="text/javascript" src="' . plugin_file('prism.js') . '&v=' . $this->version . '"></script>';
    }

    public function layout_resources_hook()
    {
        return $this->prism_includes();
    }

    public function account_update_form($p_event, $p_user_id)
    {
        echo '<tr>' .
            '<td class="category">' .
            '<label for="ToastUIEnabled">Toast UI</label>' .
            '</td>' .
            '<td>' .
            '<input id="ToastUIEnabled" type="checkbox" name="' . self::TOASTUI_ENABLED . '" value="1" ' . ($this->is_enabled($p_user_id) ? 'checked' : '') . '/>' .
            '</td>' .
            '</tr>';
    }

    public function account_update($p_event, $p_user_id)
    {
        $value = gpc_get_bool(self::TOASTUI_ENABLED, false);

        config_set(self::TOASTUI_ENABLED, (int)$value, $p_user_id, ALL_PROJECTS);
    }

    public function is_enabled($p_user_id = null)
    {
        # On pages without a real logged-in user (e.g. login_page.php) calling
        # auth_get_current_user_id() triggers access_denied() in MantisBT >= 2.28
        # (invalid/empty cookie) which redirects to login_page.php -> redirect loop.
        # Default to enabled when there is no authenticated non-anonymous user.
        if ($p_user_id === null) {
            if (!auth_is_user_authenticated() || current_user_is_anonymous()) {
                return true;
            }

            $p_user_id = auth_get_current_user_id();
        }

        $user_setting = config_get(
            self::TOASTUI_ENABLED,
            null,
            $p_user_id,
            ALL_PROJECTS
        );

        return $user_setting === null ? true : (bool)$user_setting;
    }

    private function getMentionUsers(): array
    {
        if (!auth_is_user_authenticated() || current_user_is_anonymous()) {
            return [];
        }

        $page = basename($_SERVER['SCRIPT_NAME'] ?? '');
        $issueIds = [];
        $bugnoteId = 0;
        if (gpc_isset('bug_id')) {
            $issueIds[] = gpc_get_int('bug_id');
        } elseif (in_array($page, ['view.php', 'bug_change_status_page.php'], true) && gpc_isset('id')) {
            $issueIds[] = gpc_get_int('id');
        } elseif ($page === 'bugnote_edit_page.php' && gpc_isset('bugnote_id')) {
            $bugnoteId = gpc_get_int('bugnote_id');
            if (bugnote_exists($bugnoteId)) {
                $issueIds[] = (int)bugnote_get_field($bugnoteId, 'bug_id');
            }
        } elseif ($page === 'bug_actiongroup_page.php' && gpc_isset('bug_arr')) {
            $issueIds = gpc_get_int_array('bug_arr', []);
        }

        $currentUserId = auth_get_current_user_id();
        $issues = [];
        $issueProjectIds = [];
        foreach (array_unique($issueIds) as $issueId) {
            if ($issueId <= 0 || !bug_exists($issueId)) {
                continue;
            }

            $issue = bug_get($issueId);
            $viewThreshold = config_get('view_bug_threshold', null, $currentUserId, $issue->project_id);

            if (access_has_bug_level($viewThreshold, $issueId, $currentUserId)) {
                $issues[$issueId] = $issue;
                $issueProjectIds[$issue->project_id] = $issue->project_id;
            }
        }

        $projectId = helper_get_current_project();
        $projectIds = $issues
            ? array_values($issueProjectIds)
            : ($projectId == ALL_PROJECTS
                ? user_get_all_accessible_projects($currentUserId)
                : [$projectId]);
        $users = [];

        foreach ($projectIds as $candidateProjectId) {
            $projectUsers = project_get_all_user_rows($candidateProjectId, ANYBODY);

            foreach ($projectUsers as $userId => $user) {
                $users[$userId] = $user;
            }
        }

        foreach ($users as $userId => $user) {
            if ($issues) {
                foreach ($issues as $issueId => $issue) {
                    $viewThreshold = config_get('view_bug_threshold', null, $userId, $issue->project_id);
                    $canView = $bugnoteId > 0
                        ? access_has_bugnote_level($viewThreshold, $bugnoteId, $userId)
                        : access_has_bug_level($viewThreshold, $issueId, $userId);

                    if (!$canView) {
                        unset($users[$userId]);
                        break;
                    }
                }
            } else {
                $canViewProject = false;
                foreach ($projectIds as $candidateProjectId) {
                    $viewThreshold = config_get('view_bug_threshold', null, $userId, $candidateProjectId);
                    if (access_has_project_level($viewThreshold, $candidateProjectId, $userId)) {
                        $canViewProject = true;
                        break;
                    }
                }

                if (!$canViewProject) {
                    unset($users[$userId]);
                }
            }
        }

        $showRealNames = config_get('show_realname') == ON;
        $getDisplayName = function (array $user) use ($showRealNames): string {
            if ($showRealNames && trim($user['realname']) !== '') {
                return $user['realname'] . ' (' . $user['username'] . ')';
            }

            return $user['username'];
        };

        uasort($users, function (array $left, array $right) use ($getDisplayName): int {
            return strcasecmp($getDisplayName($left), $getDisplayName($right));
        });

        return array_values(array_map(function (array $user) use ($getDisplayName): array {
            return [
                'key' => $user['username'],
                'value' => htmlspecialchars($getDisplayName($user), ENT_QUOTES, 'UTF-8'),
            ];
        }, $users));
    }

    public function layout_end_resources_hook()
    {
        $config = plugin_config_get('toastui_editor', [], true);
        $config['enabledForUser'] = $this->is_enabled();
        $config['mentionUsers'] = !empty($config['enabled']) ? $this->getMentionUsers() : [];
        $config = htmlspecialchars(json_encode($config));

        return '<link rel="stylesheet" type="text/css" href="' . plugin_file('toast/toastui-editor.min.css') . '&v=' . $this->version . '" />
                <link rel="stylesheet" type="text/css" href="' . plugin_file('toast/custom.css') . '&v=' . $this->version . '" />'
            . '<script type="text/javascript" src="' . plugin_file('toast/toastui-editor.min.js') . '&v=' . $this->version . '"></script>
		        <script  id="imaticFormatting" data-data="' . $config . '" type="text/javascript" src="' . plugin_file('main.js') . '&v=' . $this->version . '"></script>';
    }
}
