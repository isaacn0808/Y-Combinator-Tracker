import React, { useState } from 'react'
import { Company, Interaction, FundingInfo, MetricUpdate, EvaluationScores, EvaluationNotes } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { EvaluationForm } from '@/components/EvaluationForm'
import { EditableField } from '@/components/EditableField'
import { Edit2Icon } from 'lucide-react'
import {
  ArrowLeftIcon,
  LinkIcon,
  PlusIcon,
  XCircle,
} from 'lucide-react'
import InteractionsPanel from '@/components/InteractionsPanel'
import CompanyUpdateLog from '@/components/CompanyUpdateLog'
import MetricsPanel from '@/components/MetricsPanel'
import api from '@/lib/api'
interface CompanyDetailProps {
  company: Company
  onBack: () => void
  onUpdateCompany: (updatedCompany: Company) => void
}
export const CompanyDetail: React.FC<CompanyDetailProps> = ({  
  company,
  onBack,
  onUpdateCompany,
}) => {
  // Component state
  const [editedCompany, setEditedCompany] = useState<Company>({
    ...company,
    metrics: company.metrics || {
      userCount: null,
      growthRate: null,
      revenue: null,
      burnRate: null,
    },
    funding: company.funding || {
      stage: null,
      raised: null,
      valuation: null,
      runway: null,
    },
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'evaluation' | 'interactions' | 'updates'>('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [deletingMetric, setDeletingMetric] = useState<string | null>(null)
  const [isAddingInteraction, setIsAddingInteraction] = useState(false)
  const [newInteraction, setNewInteraction] = useState<Partial<Interaction>>({
    type: 'meeting',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  // Helper function to check if a name is likely a real founder name
  const isRealFounderName = (name: string): boolean => {
    // Convert to lowercase for case-insensitive comparison
    const lowercaseName = name.toLowerCase();
    
    // List of words that indicate non-human text
    const nonHumanIndicators = [
      'active',
      'founder',
      'company',
      'launch',
      'hear from',
      'meet',
      'team',
      'about',
      'contact',
      'our',
      'the',
    ];
    
    // Check if the name contains any non-human indicators
    if (nonHumanIndicators.some(word => lowercaseName.includes(word))) {
      return false;
    }
    
    // Check if the name matches or is very similar to the company name
    if (company.name && lowercaseName.includes(company.name.toLowerCase())) {
      return false;
    }
    
    // Check if the name is too short (likely an error)
    if (name.length < 3) {
      return false;
    }
    
    // Check if the name has at least two parts (first and last name)
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      return false;
    }
    
    return true;
  };

  // Event handlers
  const handleUpdateEvaluation = (
    companyId: string,
    scores: Partial<EvaluationScores>,
    notes: Partial<EvaluationNotes>,
  ) => {
    onUpdateCompany({
      ...company,
      evaluationScores: scores,
      evaluationNotes: notes,
    })
  }
  const handleUpdateStatus = (status: Company['status']) => {
    onUpdateCompany({
      ...company,
      status,
    })
  }
  const handleToggleMetWith = () => {
    onUpdateCompany({
      ...company,
      metWith: !company.metWith,
      lastMeetingDate: !company.metWith
        ? new Date().toISOString().split('T')[0]
        : company.lastMeetingDate,
    })
  }
  const handleAddInteraction = async () => {
    if (!newInteraction.date || !newInteraction.type) return
    
    try {
      // Create the interaction using the API instead of local state
      await fetch(`/api/companies/${company.id}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: newInteraction.type,
          date: newInteraction.date,
          notes: newInteraction.notes || '',
          summary: newInteraction.notes || `${newInteraction.type} interaction`,
          followUpNeeded: false,
          participants: [],
        }),
      })
      
      // Update the company's metWith status if this was a meeting
      if (newInteraction.type === 'meeting' && !company.metWith) {
        onUpdateCompany({
          ...company,
          lastMeetingDate: newInteraction.date,
          metWith: true,
        })
      }
      
      // Reset the form
      setNewInteraction({
        type: 'meeting',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      })
      setIsAddingInteraction(false)
      
      // Force a refetch of the interactions by invalidating the query cache
      // Note: This would require adding React Query's useQueryClient and invalidating the cache
      // For now, we'll rely on the InteractionsPanel to fetch the latest data on its own
    } catch (error) {
      console.error('Failed to create interaction:', error)
      alert('Failed to create interaction. Please try again.')
    }
  }
  const handleSaveEdit = () => {
    handleMetricsUpdate()
  }
  
  // Function to delete a metric or funding information
  const handleDeleteMetric = async (field: string) => {
    if (confirm(`Are you sure you want to delete the ${field} information?`)) {
      try {
        setDeletingMetric(field);
        
        // Create update data with the specific field set to null
        const updateData: Partial<{
          metrics_revenue: string | null;
          metrics_userCount: string | null;
          metrics_growthRate: string | null;
          metrics_burnRate: string | null;
          funding_stage: string | null;
          funding_raised: string | null;
          funding_valuation: string | null;
          funding_runway: string | null;
        }> = {};
        
        switch(field) {
          case 'revenue':
            updateData.metrics_revenue = null;
            break;
          case 'users':
            updateData.metrics_userCount = null;
            break;
          case 'growth':
            updateData.metrics_growthRate = null;
            break;
          case 'burn':
            updateData.metrics_burnRate = null;
            break;
          case 'stage':
            updateData.funding_stage = null;
            break;
          case 'raised':
            updateData.funding_raised = null;
            break;
          case 'valuation':
            updateData.funding_valuation = null;
            break;
          case 'runway':
            updateData.funding_runway = null;
            break;
        }
        
        // Update the company via API
        await api.put(`/api/companies/${company.id}`, updateData);
        
        // Update the local company state
        onUpdateCompany({
          ...company,
          ...updateData
        });
        
        console.log(`Deleted ${field} information successfully`);
      } catch (error) {
        console.error(`Error deleting ${field} information:`, error);
        alert(`Failed to delete ${field} information. Please try again.`);
      } finally {
        setDeletingMetric(null);
      }
    }
  }
  const handleCancelEdit = () => {
    setEditedCompany(company)
    setIsEditing(false)
  }
  const updateCompanyField = (field: keyof Company, value: Company[keyof Company] | null) => {
    setEditedCompany((prev) => ({
      ...prev,
      [field]: value !== null ? value : null,
    }))
  }

  const updateFunding = (field: keyof FundingInfo, value: string | null) => {
    setEditedCompany((prev) => ({
      ...prev,
      funding: {
        ...(prev.funding || { stage: "" }), // Ensure stage has a default if funding is new
        [field]: value !== null ? value : null,
      },
    }))
  }
  const scores = company.evaluationScores || {}
  const scoreValues = Object.values(scores).filter(
    (score) => typeof score === 'number',
  ) as number[]
  const averageScore =
    scoreValues.length > 0
      ? Math.round(
          (scoreValues.reduce((sum, score) => sum + score, 0) /
            scoreValues.length) *
            10,
        ) / 10
      : undefined
  // Add new handler for metric updates
  const handleMetricsUpdate = () => {
    if (!isEditing || !company.metrics) return
    const changes: Array<{ field: string; oldValue: string; newValue: string; }> = []
    const oldMetrics = company.metrics
    const newMetrics = editedCompany.metrics
    // Compare metrics and collect changes
    if (oldMetrics && newMetrics) {
      Object.keys(newMetrics).forEach((key) => {
        const typedKey = key as keyof typeof newMetrics
        if (oldMetrics[typedKey] !== newMetrics[typedKey]) {
          changes.push({
            field: key,
            oldValue: oldMetrics[typedKey] || '',
            newValue: newMetrics[typedKey] || '',
          })
        }
      })
    }
    // If there are changes, create an update record
    if (changes.length > 0) {
      const update: MetricUpdate = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        type: 'metrics',
        changes,
      }
      const updates = [...(company.updates || []), update]
      onUpdateCompany({
        ...editedCompany,
        updates,
      })
    } else {
      onUpdateCompany(editedCompany)
    }
    setIsEditing(false)
  }
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center mb-6">
        <button
          type="button"
          onClick={onBack}
          className="mr-4 p-1 rounded-full hover:bg-gray-100"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <StatusBadge status={company.status} />
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {company.batch}
          </span>
          {company.sectors && company.sectors.map((sector, index) => (
            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {sector}
            </span>
          ))}
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {company.businessModel}
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {company.developmentStage}
          </span>
        </div>
        {averageScore !== undefined && (
          <div className="ml-auto flex items-center">
            <span className="text-sm font-medium text-gray-700 mr-2">
              Overall Score:
            </span>
            <span className="text-lg font-semibold text-gray-900">
              {averageScore}/10
            </span>
          </div>
        )}
      </div>
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <p className="text-sm text-gray-600 mb-4">{company.description}</p>
        <div className="flex items-center mb-4">
          <LinkIcon className="h-4 w-4 text-gray-500 mr-2" />
          <a
            href={company.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
          >
            {company.website}
          </a>
        </div>

        {/* Founders Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Founders</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {company.founders && company.founders.filter(founder => isRealFounderName(founder.name)).length > 0 ? (
              company.founders
                .filter(founder => isRealFounderName(founder.name))
                .map((founder, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">{founder.name}</h4>
                      {founder.title && (
                        <p className="text-sm text-gray-600 mt-1">{founder.title}</p>
                      )}
                    </div>
                    {founder.linkedin && (
                      <a
                        href={founder.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                        title="View LinkedIn Profile"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </a>
                    )}
                  </div>
                  {founder.bio && (
                    <p className="text-sm text-gray-600 mt-2">{founder.bio}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="col-span-full text-gray-500 text-sm">
                No founder information available
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics Section - Always visible */}
        <div className="mb-6">
          <MetricsPanel 
            metrics={{
              userCount: editedCompany.metrics?.userCount ? Number(editedCompany.metrics.userCount) : null,
              growthRate: editedCompany.metrics?.growthRate ? Number(editedCompany.metrics.growthRate) : null,
              revenue: editedCompany.metrics?.revenue || null,
              burnRate: editedCompany.metrics?.burnRate || null,
            }}
            onUpdate={async (updatedMetrics) => {
              const newCompany = {
                ...editedCompany,
                metrics: {
                  ...editedCompany.metrics,
                  userCount: updatedMetrics.userCount?.toString(),
                  growthRate: updatedMetrics.growthRate?.toString(),
                  revenue: updatedMetrics.revenue,
                  burnRate: updatedMetrics.burnRate,
                }
              };
              setEditedCompany(newCompany);
              await onUpdateCompany(newCompany);
            }}
          />
        </div>
        
        {/* Funding Info Section - Always visible */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Funding Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Funding Stage */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm relative group">
              <div className="flex justify-between items-start">
                <h4 className="text-xs font-medium text-gray-500">Stage</h4>
                {company.funding_stage && (
                  <button
                    onClick={() => handleDeleteMetric('stage')}
                    disabled={deletingMetric === 'stage'}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500"
                    title="Delete funding stage information"
                  >
                    {deletingMetric === 'stage' ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      <XCircle size={14} />
                    )}
                  </button>
                )}
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {company.funding_stage || 'Not Available'}
              </p>
            </div>
            
            {/* Total Raised */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm relative group">
              <div className="flex justify-between items-start">
                <h4 className="text-xs font-medium text-gray-500">Total Raised</h4>
                {company.funding_raised && (
                  <button
                    onClick={() => handleDeleteMetric('raised')}
                    disabled={deletingMetric === 'raised'}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500"
                    title="Delete funding raised information"
                  >
                    {deletingMetric === 'raised' ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      <XCircle size={14} />
                    )}
                  </button>
                )}
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {company.funding_raised || 'Not Available'}
              </p>
            </div>
            
            {/* Valuation */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm relative group">
              <div className="flex justify-between items-start">
                <h4 className="text-xs font-medium text-gray-500">Valuation</h4>
                {company.funding_valuation && (
                  <button
                    onClick={() => handleDeleteMetric('valuation')}
                    disabled={deletingMetric === 'valuation'}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500"
                    title="Delete valuation information"
                  >
                    {deletingMetric === 'valuation' ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      <XCircle size={14} />
                    )}
                  </button>
                )}
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {company.funding_valuation || 'Not Available'}
              </p>
            </div>
            
            {/* Runway */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm relative group">
              <div className="flex justify-between items-start">
                <h4 className="text-xs font-medium text-gray-500">Runway</h4>
                {company.funding_runway && (
                  <button
                    onClick={() => handleDeleteMetric('runway')}
                    disabled={deletingMetric === 'runway'}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500"
                    title="Delete runway information"
                  >
                    {deletingMetric === 'runway' ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      <XCircle size={14} />
                    )}
                  </button>
                )}
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {company.funding_runway || 'Not Available'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleToggleMetWith}
            className={`inline-flex items-center px-3 py-1.5 border rounded-md text-sm font-medium ${company.metWith ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
          >
            {company.metWith ? 'Met ✓' : 'Not Met Yet'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => handleUpdateStatus('watching')}
              className={`px-3 py-1.5 border rounded-md text-sm font-medium ${company.status === 'watching' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
            >
              Watching
            </button>
            <button
              onClick={() => handleUpdateStatus('engaged')}
              className={`px-3 py-1.5 border rounded-md text-sm font-medium ${company.status === 'engaged' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
            >
              Engaged
            </button>
            <button
              onClick={() => handleUpdateStatus('invested')}
              className={`px-3 py-1.5 border rounded-md text-sm font-medium ${company.status === 'invested' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
            >
              Invested
            </button>
            <button
              onClick={() => handleUpdateStatus('passed')}
              className={`px-3 py-1.5 border rounded-md text-sm font-medium ${company.status === 'passed' ? 'bg-gray-200 text-gray-700 border-gray-300' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
            >
              Passed
            </button>
          </div>
        </div>
      </div>
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'evaluation' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Evaluation
            </button>
            <button
              onClick={() => setActiveTab('interactions')}
              className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'interactions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Interactions
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${activeTab === 'updates' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Updates
            </button>
          </nav>
        </div>
      </div>
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Company Information
              </h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit2Icon className="h-4 w-4 mr-1.5" />
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
            <EditableField
              label="Company Name"
              value={editedCompany.name}
              onChange={(value) => updateCompanyField('name', value)}
              isEditing={isEditing}
            />
            <EditableField
              label="One-liner"
              value={editedCompany.oneLiner}
              onChange={(value) => updateCompanyField('oneLiner', value)}
              isEditing={isEditing}
            />
            <EditableField
              label="Description"
              value={editedCompany.description}
              onChange={(value) => updateCompanyField('description', value)}
              isEditing={isEditing}
              type="textarea"
            />
            <EditableField
              label="Website"
              value={editedCompany.website}
              onChange={(value) => updateCompanyField('website', value)}
              isEditing={isEditing}
              type="url"
            />
            <EditableField
              label="Founded"
              value={editedCompany.foundingDate}
              onChange={(value) => updateCompanyField('foundingDate', value)}
              isEditing={isEditing}
              type="date"
            />
            <EditableField
              label="Product Status"
              value={editedCompany.productStatus}
              onChange={(value) => updateCompanyField('productStatus', value)}
              isEditing={isEditing}
              type="select"
              options={['pre-launch', 'beta', 'live']}
            />

            <EditableField
              label="Development Stage"
              value={editedCompany.developmentStage}
              onChange={(value) =>
                updateCompanyField('developmentStage', value)
              }
              isEditing={isEditing}
              type="select"
              options={['idea', 'mvp', 'pmf', 'growth', 'scale']}
            />

          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
            <div className="space-y-4">
              <EditableField
                label="Business Model"
                value={editedCompany.businessModel}
                onChange={(value) => updateCompanyField('businessModel', value)}
                isEditing={isEditing}
              />
              <EditableField
                label="Sectors"
                value={editedCompany.sectors ? editedCompany.sectors.join(', ') : ''}
                onChange={(value) => updateCompanyField('sectors', value ? value.split(',').map(s => s.trim()) : [])}
                isEditing={isEditing}
              />
            </div>
          </div>
          {editedCompany.funding && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Funding
              </h3>
              <EditableField
                label="Stage"
                value={editedCompany.funding?.stage || null}
                onChange={(value) => updateFunding('stage', value)}
                isEditing={isEditing}
              />
              <EditableField
                label="Amount Raised"
                value={editedCompany.funding?.raised || null}
                onChange={(value) => updateFunding('raised', value)}
                isEditing={isEditing}
              />
              <EditableField
                label="Valuation"
                value={editedCompany.funding?.valuation || null}
                onChange={(value) => updateFunding('valuation', value)}
                isEditing={isEditing}
              />
              <EditableField
                label="Runway"
                value={editedCompany.funding?.runway || null}
                onChange={(value) => updateFunding('runway', value)}
                isEditing={isEditing}
              />
            </div>
          )}
        </div>
      )}
      {activeTab === 'evaluation' && (
        <EvaluationForm
          company={company}
          onUpdateEvaluation={handleUpdateEvaluation}
        />
      )}
      {activeTab === 'interactions' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Interactions</h3>
            <button
              type="button"
              onClick={() => setIsAddingInteraction(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Interaction
            </button>
          </div>
          {isAddingInteraction && (
            <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-4">
                New Interaction
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={newInteraction.type}
                    onChange={(e) =>
                      setNewInteraction({
                        ...newInteraction,
                        type: e.target.value as Interaction['type'],
                      })
                    }
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="meeting">Meeting</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="demo">Demo</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={newInteraction.date}
                    onChange={(e) =>
                      setNewInteraction({
                        ...newInteraction,
                        date: e.target.value,
                      })
                    }
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newInteraction.notes || ''}
                  onChange={(e) =>
                    setNewInteraction({
                      ...newInteraction,
                      notes: e.target.value,
                    })
                  }
                  rows={3}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddingInteraction(false)}
                  className="mr-2 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddInteraction}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Save
                </button>
              </div>
            </div>
          )}
          
          {/* Replace the custom interaction display with the InteractionsPanel component */}
          <InteractionsPanel companyId={company.id} />
        </div>
      )}
      {activeTab === 'updates' && <CompanyUpdateLog companyId={company.id} />}
    </div>
  )
}
