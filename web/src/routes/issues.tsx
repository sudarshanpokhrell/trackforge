import { createFileRoute } from '@tanstack/react-router'
import { IssueList } from '@/components/issues/IssueList'
import { globalIssues } from '@/components/issues/data'

export const Route = createFileRoute('/issues')({
  component: IssuesPage,
})

function IssuesPage() {
  return <IssueList initialIssues={globalIssues} />
}
