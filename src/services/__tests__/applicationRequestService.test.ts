import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabase } from '@/test/test-utils';
import * as applicationRequestService from '../applicationRequestService';
import { 
  ApplicationRequest, 
  ApplicationRequestStatus, 
  ApplicationRequestFilters 
} from '@/types/__mocks__/application';

// Mock the types
const mockApplicationRequest: any = {
  id: '1',
  property_id: 'prop1',
  tenant_id: 'tenant1',
  landlord_id: 'landlord1',
  status: ApplicationRequestStatus.PENDING,
  message: 'Test application',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

describe('Application Request Service', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockApplicationRequest, error: null }),
      update: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      data: null,
      error: null
    });
  });

  describe('createApplicationRequest', () => {
    it('should create a new application request', async () => {
      // Arrange
      const newRequest = {
        property_id: 'prop1',
        tenant_id: 'tenant1',
        landlord_id: 'landlord1',
        message: 'Test application'
      };

      // Act
      const result = await applicationRequestService.createApplicationRequest(newRequest);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('application_requests');
      expect(mockSupabase.from('').insert).toHaveBeenCalledWith([{
        ...newRequest,
        status: ApplicationRequestStatus.PENDING,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      }]);
      expect(result).toEqual(mockApplicationRequest);
    });

    it('should throw an error when creation fails', async () => {
      // Arrange
      const error = new Error('Database error');
      mockSupabase.from('').insert.mockRejectedValueOnce(error);

      // Act & Assert
      await expect(
        applicationRequestService.createApplicationRequest({} as any)
      ).rejects.toThrow('Database error');
    });
  });

  describe('getApplicationRequest', () => {
    it('should fetch an application request by id', async () => {
      // Act
      const result = await applicationRequestService.getApplicationRequest('1');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('application_requests');
      expect(mockSupabase.from('').select).toHaveBeenCalledWith('*');
      expect(mockSupabase.from('').eq).toHaveBeenCalledWith('id', '1');
      expect(result).toEqual(mockApplicationRequest);
    });
  });

  describe('updateApplicationRequestStatus', () => {
    it('should update the status of an application request', async () => {
      // Arrange
      const updateData = {
        status: ApplicationRequestStatus.APPROVED,
        updated_at: expect.any(String),
        updated_by: 'user1'
      };

      // Act
      const result = await applicationRequestService.updateApplicationRequestStatus(
        '1', 
        ApplicationRequestStatus.APPROVED, 
        'user1'
      );

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('application_requests');
      expect(mockSupabase.from('').update).toHaveBeenCalledWith(updateData);
      expect(mockSupabase.from('').eq).toHaveBeenCalledWith('id', '1');
      expect(result).toEqual(mockApplicationRequest);
    });
  });

  describe('getApplicationRequests', () => {
    it('should fetch application requests with filters', async () => {
      // Arrange
      const filters = {
        status: ApplicationRequestStatus.PENDING,
        property_id: 'prop1',
        search: 'test'
      };

      // Mock the chained methods
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ 
          data: [mockApplicationRequest], 
          count: 1,
          error: null 
        })
      };
      
      mockSupabase.from.mockReturnValue({
        ...mockSupabase.from(),
        ...mockQuery
      });

      // Act
      const result = await applicationRequestService.getApplicationRequests(filters);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('application_requests');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', ApplicationRequestStatus.PENDING);
      expect(mockQuery.eq).toHaveBeenCalledWith('property_id', 'prop1');
      expect(mockQuery.or).toHaveBeenCalledWith('property.title.ilike.%test%,tenant.full_name.ilike.%test%');
      expect(result).toEqual({
        data: [mockApplicationRequest],
        count: 1,
        error: null
      });
    });
  });
});
