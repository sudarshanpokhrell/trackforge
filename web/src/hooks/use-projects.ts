import { api } from "@/lib/api";
import type { Project } from "@/types/projects";
import { queryOptions } from "@tanstack/react-query";


export const projectsQuery = queryOptions({
    queryKey: ["projects"],
    queryFn: async () => {
        const {projects} = await api.get("/projects").json<{projects: Project[]}>() 
        return projects
    }
})

export const projectQuery = (id: number)=> queryOptions({
    queryKey: ["projects", id],
    queryFn: async ()=> {
        const {project} = await api.get(`/projects/${id}`).json<{project: Project}>()
        return project
    }
})