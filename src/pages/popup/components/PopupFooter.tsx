interface PopupFooterLink {
  href: string;
  label: string;
  title: string;
}

const POPUP_FOOTER_LINKS: PopupFooterLink[] = [
  {
    label: '更新日志',
    href: 'https://github.com/Jsmond2016/quick-copy-ext/blob/main/CHANGELOG.md',
    title: 'quick-copy-ext/CHANGELOG.md at main · Jsmond2016/quick-copy-ext',
  },
  {
    label: 'Github',
    href: 'https://github.com/Jsmond2016/quick-copy-ext',
    title: 'GitHub - Jsmond2016/quick-copy-ext: 在 web 页面中快速复制接口信息，用于反馈给开发和测试',
  },
  {
    label: '作者-Jsmond2016',
    href: 'https://github.com/Jsmond2016',
    title: 'Jsmond2016 - Overview',
  },
];

interface PopupFooterProps {
  versionText: string;
}

export function PopupFooter({ versionText }: PopupFooterProps) {
  return (
    <div className="popup-version">
      <span>{versionText}</span>
      {POPUP_FOOTER_LINKS.map((link) => (
        <span key={link.href} className="popup-version-segment">
          <span className="popup-version-divider" aria-hidden="true">|</span>
          <a
            className="popup-version-link"
            href={link.href}
            target="_blank"
            rel="noreferrer"
            title={link.title}
          >
            {link.label}
          </a>
        </span>
      ))}
    </div>
  );
}
