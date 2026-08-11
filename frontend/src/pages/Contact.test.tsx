import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Contact } from './Contact';

describe('Contact', () => {
    it('welcomes collaboration inquiries from companies and organizations', () => {
        render(<Contact />);

        expect(screen.getByText(/企業・団体との提携、共同企画、技術交流/u)).toBeInTheDocument();
        expect(screen.getByText(/協賛・コラボレーションのご相談/u)).toBeInTheDocument();
    });
});
