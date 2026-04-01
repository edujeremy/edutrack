'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile, Student } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConsultationFormProps {
  students: (Student & { profile: Profile })[]
  teachers: Profile[]
  onSubmit: (data: any) => Promise<void>
  initialData?: any
  isLoading?: boolean
}

const consultationTypes = [
  { value: '초기상담', label: '초기상담' },
  { value: '정기상담', label: '정기상담' },
  { value: '긴급상담', label: '긴급상담' },
  { value: '입시전략', label: '입시전략' },
]

export function ConsultationForm({
  students,
  teachers,
  onSubmit,
  initialData,
  isLoading = false,
}: ConsultationFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const [formData, setFormData] = useState({
    student_id: initialData?.student_id || '',
    teacher_id: initialData?.teacher_id || '',
    consultation_type: initialData?.topics?.[0] || '',
    title: initialData?.title || '',
    content: initialData?.notes || '',
    next_steps: initialData?.next_steps || '',
    consultation_date: initialData?.consultation_date?.split('T')[0] || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.student_id || !formData.consultation_type || !formData.consultation_date) {
      toast({
        title: '오류',
        description: '필수 항목을 모두 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        student_id: formData.student_id,
        teacher_id: formData.teacher_id,
        topics: [formData.consultation_type],
        notes: formData.content,
        next_steps: formData.next_steps || null,
        consultation_date: new Date(formData.consultation_date).toISOString(),
      })

      toast({
        title: '성공',
        description: '상담 기록이 저장되었습니다.',
      })

      router.push('/dashboard/consultations')
      router.refresh()
    } catch (error) {
      toast({
        title: '오류',
        description: '저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedStudent = students.find((s) => s.id === formData.student_id)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="student">학생 선택</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
            >
              {selectedStudent
                ? selectedStudent.profile.name
                : '학생을 선택해주세요...'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0">
            <Command>
              <CommandInput placeholder="학생 검색..." />
              <CommandEmpty>학생을 찾을 수 없습니다.</CommandEmpty>
              <CommandGroup>
                {students.map((student) => (
                  <CommandItem
                    key={student.id}
                    value={student.id}
                    onSelect={(currentValue) => {
                      setFormData((prev) => ({
                        ...prev,
                        student_id:
                          currentValue === prev.student_id ? '' : currentValue,
                      }))
                      setOpen(false)
                    }}
                  >
                    <CheckCircle2
                      className={cn(
                        'mr-2 h-4 w-4',
                        formData.student_id === student.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    {student.profile?.name || '학생'}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <Label htmlFor="consultation_type">상담 유형</Label>
        <Select
          value={formData.consultation_type}
          onValueChange={(value) =>
            setFormData((prev) => ({ ...prev, consultation_type: value }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="상담 유형을 선택해주세요" />
          </SelectTrigger>
          <SelectContent>
            {consultationTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="consultation_date">상담 예정일</Label>
        <Input
          type="date"
          value={formData.consultation_date}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              consultation_date: e.target.value,
            }))
          }
          required
        />
      </div>

      <div>
        <Label htmlFor="content">상담 내용</Label>
        <Textarea
          id="content"
          placeholder="상담 내용을 입력해주세요..."
          value={formData.content}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, content: e.target.value }))
          }
          className="min-h-[150px]"
        />
      </div>

      <div>
        <Label htmlFor="next_steps">다음 단계</Label>
        <Textarea
          id="next_steps"
          placeholder="다음 상담 계획이나 조치 사항을 입력해주세요..."
          value={formData.next_steps}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, next_steps: e.target.value }))
          }
          className="min-h-[100px]"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={loading || isLoading}
          className="flex-1"
        >
          {loading ? '저장 중...' : '저장'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          취소
        </Button>
      </div>
    </form>
  )
}
