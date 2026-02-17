/**
 * Tests for Brand validation schemas
 * @module __tests__/lib/validations/brand.schema.test
 */

import {
  createBrandSchema,
  updateBrandSchema,
  adminUpdateBrandSchema,
  brandIndustryEnum,
  brandVerificationStatusEnum,
} from '@/lib/validations/brand.schema';

describe('Brand Validation Schemas', () => {
  describe('brandIndustryEnum', () => {
    const validIndustries = [
      'sports_apparel',
      'sports_equipment',
      'food_beverage',
      'fitness',
      'technology',
      'automotive',
      'financial_services',
      'entertainment',
      'healthcare',
      'education',
      'retail',
      'media',
      'other',
    ];

    it('accepts all valid industry types', () => {
      validIndustries.forEach((industry) => {
        const result = brandIndustryEnum.safeParse(industry);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid industry types', () => {
      const invalidIndustries = ['unknown', 'invalid', 'sports', ''];

      invalidIndustries.forEach((industry) => {
        const result = brandIndustryEnum.safeParse(industry);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('brandVerificationStatusEnum', () => {
    it('accepts all valid verification statuses', () => {
      const validStatuses = ['pending', 'verified', 'rejected'];

      validStatuses.forEach((status) => {
        const result = brandVerificationStatusEnum.safeParse(status);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid verification statuses', () => {
      const invalidStatuses = ['approved', 'denied', 'active', ''];

      invalidStatuses.forEach((status) => {
        const result = brandVerificationStatusEnum.safeParse(status);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('createBrandSchema', () => {
    it('validates a complete brand profile', () => {
      const input = {
        company_name: 'Nike Inc.',
        description: 'Leading sports apparel company',
        industry: 'sports_apparel',
        website: 'https://nike.com',
        logo_url: 'https://nike.com/logo.png',
        contact_name: 'John Smith',
        contact_email: 'john@nike.com',
        contact_phone: '+1-503-555-1234',
        address_line1: '123 Nike Way',
        address_line2: 'Suite 100',
        city: 'Beaverton',
        state: 'OR',
        postal_code: '97005',
        country: 'United States',
        tax_id: '12-3456789',
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates minimum required fields', () => {
      const input = {
        company_name: 'Test Brand',
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects empty company name', () => {
      const input = {
        company_name: '',
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects whitespace-only company name', () => {
      const input = {
        company_name: '   ',
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects company name exceeding 200 characters', () => {
      const input = {
        company_name: 'A'.repeat(201),
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates website URL', () => {
      const input = {
        company_name: 'Test',
        website: 'https://example.com',
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid website URL', () => {
      const input = {
        company_name: 'Test',
        website: 'not-a-valid-url',
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates logo URL', () => {
      const input = {
        company_name: 'Test',
        logo_url: 'https://example.com/logo.png',
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid logo URL', () => {
      const input = {
        company_name: 'Test',
        logo_url: 'invalid-url',
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates contact email', () => {
      const input = {
        company_name: 'Test',
        contact_email: 'contact@example.com',
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid contact email', () => {
      const input = {
        company_name: 'Test',
        contact_email: 'not-an-email',
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('allows null optional fields', () => {
      const input = {
        company_name: 'Test',
        description: null,
        industry: null,
        website: null,
        logo_url: null,
        contact_name: null,
        contact_email: null,
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates all industry types', () => {
      const industries = [
        'sports_apparel', 'sports_equipment', 'food_beverage', 'fitness',
        'technology', 'automotive', 'financial_services', 'entertainment',
        'healthcare', 'education', 'retail', 'media', 'other',
      ];

      industries.forEach((industry) => {
        const input = {
          company_name: 'Test',
          industry,
        };

        const result = createBrandSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('rejects description exceeding 2000 characters', () => {
      const input = {
        company_name: 'Test',
        description: 'A'.repeat(2001),
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('strips control characters from company name', () => {
      const input = {
        company_name: 'Test\x00Company',
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.company_name).toBe('TestCompany');
      }
    });

    it('validates postal code length', () => {
      const input = {
        company_name: 'Test',
        postal_code: 'A'.repeat(21),
      };

      const result = createBrandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('updateBrandSchema', () => {
    it('allows empty update', () => {
      const input = {};

      const result = updateBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows partial updates', () => {
      const input = {
        company_name: 'Updated Name',
        website: 'https://new-website.com',
      };

      const result = updateBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows nullable fields', () => {
      const input = {
        description: null,
        industry: null,
        website: null,
      };

      const result = updateBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates company name when provided', () => {
      const input = {
        company_name: 'Valid Name',
      };

      const result = updateBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.company_name).toBe('Valid Name');
      }
    });

    it('validates website when provided', () => {
      const input = {
        website: 'https://valid-url.com',
      };

      const result = updateBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid website when provided', () => {
      const input = {
        website: 'invalid',
      };

      const result = updateBrandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('does not include tax_id field', () => {
      const input = {
        tax_id: '12-3456789',
      };

      // tax_id should be stripped from regular update
      const result = updateBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('tax_id');
      }
    });

    it('does not include verification_status field', () => {
      const input = {
        verification_status: 'verified',
      };

      // verification_status should be stripped from regular update
      const result = updateBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('verification_status');
      }
    });
  });

  describe('adminUpdateBrandSchema', () => {
    it('allows all regular update fields', () => {
      const input = {
        company_name: 'Updated Name',
        description: 'New description',
        industry: 'technology',
      };

      const result = adminUpdateBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows tax_id update', () => {
      const input = {
        tax_id: '12-3456789',
      };

      const result = adminUpdateBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tax_id).toBe('12-3456789');
      }
    });

    it('allows verification_status update', () => {
      const input = {
        verification_status: 'verified',
      };

      const result = adminUpdateBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.verification_status).toBe('verified');
      }
    });

    it('validates all verification statuses', () => {
      const statuses = ['pending', 'verified', 'rejected'];

      statuses.forEach((status) => {
        const input = { verification_status: status };
        const result = adminUpdateBrandSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid verification status', () => {
      const input = {
        verification_status: 'approved',
      };

      const result = adminUpdateBrandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('allows verified_at timestamp', () => {
      const input = {
        verification_status: 'verified',
        verified_at: '2024-01-15T10:30:00Z',
      };

      const result = adminUpdateBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('allows null verified_at', () => {
      const input = {
        verified_at: null,
      };

      const result = adminUpdateBrandSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid verified_at format', () => {
      const input = {
        verified_at: 'not-a-date',
      };

      const result = adminUpdateBrandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates tax_id length', () => {
      const input = {
        tax_id: 'A'.repeat(51),
      };

      const result = adminUpdateBrandSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
