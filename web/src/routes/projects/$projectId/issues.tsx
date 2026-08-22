import { globalIssues } from '@/components/issues/data'
import { IssueList } from '@/components/issues/IssueList'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/projects/$projectId/issues')({
    component: RouteComponent,
})

function RouteComponent() {
    return <IssueList initialIssues={globalIssues} />

}
