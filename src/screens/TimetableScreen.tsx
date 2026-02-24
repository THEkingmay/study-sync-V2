import { useEffect, useState } from "react";
import { View, Text } from "react-native";

import { db } from "../../firebaseConfig";


export type StudyType = {
    id: string
    class_code: string,
    class_name: string,
    room: string,
    professor_name: string,
    day: string,
    start: number,
    end: number,
    userId: string
}

export type ExamType = {
    id: string,
    class_code: string,
    class_name: string,
    day: string,
    start: number,
    end: number,
    userId: string
}

const renderStudy = (study: StudyType[]) => {
    return (
        <View>
            <Text>สวัสดีร</Text>
        </View>
    )
}
const renderExam = (Exam: ExamType[]) => {
    return (
        <View>
            <Text>สวัสดีร</Text>
        </View>
    )
}
export default function TimetableScreen() {

    const [selectMode, setSelectMode] = useState<'study' | 'exam'>('study')
    const [study, setStudy] = useState<StudyType[]>([])
    const [exam , setExam] = useState<ExamType[]>([])

    const fetchStudyData = async () => {

    }
    const fetchExamData = async () =>{
        
    }

    useEffect(() => {
        fetchStudyData()
    }, [])

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: "center" }}>
            {/* Top tab to switch */}
            <View>
                <Text>ตารางเรียน</Text>
                <Text>ตารางสอบ</Text>
            </View>

            {
                selectMode === 'study' ? (
                    renderStudy(study)
                ) : (
                    renderExam(exam)
                )
            }
        </View>
    )
}

