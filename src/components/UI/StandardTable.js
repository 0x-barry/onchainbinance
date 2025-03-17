import React from 'react';
import styled from 'styled-components';

// Main container for the table and its filters
const TableWrapper = styled.div`
  background: ${props => props.theme.colors.secondary};
  border-radius: ${props => props.theme.borderRadius.medium};
  padding: 1.5rem;
  margin-bottom: 2rem;
  width: 100%;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

// Container for the date filters that will be positioned at the top right
const DateFiltersContainer = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  justify-content: flex-end;
  align-items: center;
`;

// Container for the main filters that will be inside the table background
const FiltersContainer = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

// Styled filter input
const FilterInput = styled.input`
  background: ${props => props.theme.colors.background};
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${props => props.theme.colors.text.primary};
  padding: 0.5rem 0.75rem;
  border-radius: ${props => props.theme.borderRadius.small};
  font-family: ${props => props.theme.fonts.body};
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

// Styled filter select
const FilterSelect = styled.select`
  background: ${props => props.theme.colors.background};
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${props => props.theme.colors.text.primary};
  padding: 0.5rem 0.75rem;
  border-radius: ${props => props.theme.borderRadius.small};
  font-family: ${props => props.theme.fonts.body};
  font-size: 0.9rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

// Label for filters
const FilterLabel = styled.label`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.85rem;
  margin-right: 0.5rem;
`;

// Container for the table with overflow handling
const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
`;

// The table itself
const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  
  /* Default column width variables - all columns get equal width by default */
  --col1-width: ${props => props.columns ? `${100 / props.columns}%` : 'auto'};
  --col2-width: ${props => props.columns ? `${100 / props.columns}%` : 'auto'};
  --col3-width: ${props => props.columns ? `${100 / props.columns}%` : 'auto'};
  --col4-width: ${props => props.columns ? `${100 / props.columns}%` : 'auto'};
  --col5-width: ${props => props.columns ? `${100 / props.columns}%` : 'auto'};
  --col6-width: ${props => props.columns ? `${100 / props.columns}%` : 'auto'};
  
  th, td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  th {
    font-weight: ${props => props.theme.fontWeights.bold};
    color: ${props => props.theme.colors.text.secondary};
    font-family: ${props => props.theme.fonts.body};
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  td {
    font-family: ${props => props.theme.fonts.body};
    color: ${props => props.theme.colors.text.primary};
    font-size: 0.9rem;
  }
  
  tbody tr:hover {
    background-color: rgba(255, 255, 255, 0.03);
  }
  
  /* Column width specifications using CSS variables */
  th:nth-child(1), td:nth-child(1) { width: var(--col1-width); }
  th:nth-child(2), td:nth-child(2) { width: var(--col2-width); }
  th:nth-child(3), td:nth-child(3) { width: var(--col3-width); }
  th:nth-child(4), td:nth-child(4) { width: var(--col4-width); }
  th:nth-child(5), td:nth-child(5) { width: var(--col5-width); }
  th:nth-child(6), td:nth-child(6) { width: var(--col6-width); }
`;

// Sticky header for the table
const TableHeader = styled.thead`
  position: sticky;
  top: 0;
  background: ${props => props.theme.colors.secondary};
  z-index: 10;
  
  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
  }
`;

// Sortable header cell
const SortableHeader = styled.th`
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-right: 2rem !important;

  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .sort-indicator {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    opacity: ${props => props.$active ? 1 : 0.3};
    transition: opacity 0.2s;
  }
`;

// Pagination container
const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1.5rem;
  gap: 1rem;
`;

// Pagination button
const PaginationButton = styled.button`
  background: ${props => props.theme.colors.background};
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: ${props => props.theme.colors.text.primary};
  padding: 0.5rem 0.75rem;
  border-radius: ${props => props.theme.borderRadius.small};
  cursor: pointer;
  font-family: ${props => props.theme.fonts.body};
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.05);
  }
`;

// Pagination info
const PaginationInfo = styled.div`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.9rem;
`;

/**
 * StandardTable component
 * @param {Object} props - Component props
 * @param {Array} props.columns - Array of column definitions
 * @param {Array} props.data - Array of data objects
 * @param {Object} props.filters - Filter configuration
 * @param {Function} props.onFilterChange - Filter change handler
 * @param {Object} props.sortConfig - Sort configuration
 * @param {Function} props.onSort - Sort handler
 * @param {Object} props.pagination - Pagination configuration
 * @param {Function} props.onPageChange - Page change handler
 * @param {Function} props.renderRow - Custom row renderer
 * @param {Function} props.renderExpandedRow - Custom expanded row renderer
 * @param {React.ReactNode} props.headerContent - Custom content to render above the filters
 * @param {Object} props.columnWidths - Custom column widths (e.g., { col1: '20%', col2: '30%' })
 */
const StandardTable = ({
  columns,
  data,
  filters,
  onFilterChange,
  sortConfig,
  onSort,
  pagination,
  onPageChange,
  renderRow,
  renderExpandedRow,
  headerContent,
  columnWidths,
}) => {
  // Extract date filters and other filters
  const dateFilters = filters?.dateFilters || [];
  const mainFilters = filters?.mainFilters || [];

  // Create a style object for custom column widths
  const tableStyle = {};
  if (columnWidths) {
    Object.entries(columnWidths).forEach(([col, width]) => {
      tableStyle[`--${col}-width`] = width;
    });
  }

  return (
    <>
      {/* Date filters at the top right */}
      {dateFilters.length > 0 && (
        <DateFiltersContainer>
          {dateFilters.map((filter) => (
            <div key={filter.id} style={{ display: 'flex', alignItems: 'center' }}>
              <FilterLabel htmlFor={filter.id}>{filter.label}</FilterLabel>
              <FilterInput
                id={filter.id}
                type="date"
                value={filter.value}
                onChange={(e) => onFilterChange(filter.id, e.target.value)}
              />
            </div>
          ))}
        </DateFiltersContainer>
      )}

      {/* Main table wrapper with background */}
      <TableWrapper>
        {/* Custom header content */}
        {headerContent && (
          <div style={{ marginBottom: '1.5rem' }}>
            {headerContent}
          </div>
        )}
        
        {/* Main filters inside the table background */}
        {mainFilters.length > 0 && (
          <FiltersContainer>
            {mainFilters.map((filter) => (
              <div key={filter.id} style={{ display: 'flex', alignItems: 'center' }}>
                <FilterLabel htmlFor={filter.id}>{filter.label}</FilterLabel>
                {filter.type === 'select' ? (
                  <FilterSelect
                    id={filter.id}
                    value={filter.value}
                    onChange={(e) => onFilterChange(filter.id, e.target.value)}
                  >
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </FilterSelect>
                ) : (
                  <FilterInput
                    id={filter.id}
                    type={filter.type || 'text'}
                    value={filter.value}
                    onChange={(e) => onFilterChange(filter.id, e.target.value)}
                    placeholder={filter.placeholder}
                  />
                )}
              </div>
            ))}
          </FiltersContainer>
        )}

        {/* Table container with overflow handling */}
        <TableContainer>
          <Table style={tableStyle} columns={columns.length}>
            <TableHeader>
              <tr>
                {columns.map((column) => (
                  column.sortable ? (
                    <SortableHeader
                      key={column.id}
                      onClick={() => onSort && onSort(column.id)}
                      $active={sortConfig?.key === column.id}
                    >
                      {column.label}
                      {sortConfig?.key === column.id && (
                        <span className="sort-indicator">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </SortableHeader>
                  ) : (
                    <th key={column.id}>{column.label}</th>
                  )
                ))}
              </tr>
            </TableHeader>
            <tbody>
              {data.map((item, index) => (
                renderRow ? (
                  renderRow(item, index)
                ) : (
                  <tr key={index}>
                    {columns.map((column) => (
                      <td key={`${index}-${column.id}`}>
                        {column.render ? column.render(item) : item[column.id]}
                      </td>
                    ))}
                  </tr>
                )
              ))}
            </tbody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {pagination && (
          <PaginationContainer>
            <PaginationButton
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
            >
              Previous
            </PaginationButton>
            <PaginationInfo>
              Page {pagination.currentPage} of {pagination.totalPages}
            </PaginationInfo>
            <PaginationButton
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
            >
              Next
            </PaginationButton>
          </PaginationContainer>
        )}
      </TableWrapper>
    </>
  );
};

export default StandardTable; 